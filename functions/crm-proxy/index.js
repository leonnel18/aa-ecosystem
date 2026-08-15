'use strict';

// crm-proxy — Catalyst Advanced I/O Function (Node.js 18)
// Ported from the original Cloudflare Worker (portal/workers/crm-proxy.js).
// Proxies Zoho CRM API calls from the browser. Keeps OAuth credentials
// server-side. Route logic and write behavior are unchanged from the
// Cloudflare version — see CLAUDE.md for the READ-ONLY invariant this
// function does not currently satisfy (flagged, not fixed, per the
// Catalyst migration plan).
//
// Routes handled:
//   GET  /solutions                  -> GET  /crm/v6/Solutions (list, admin)
//   POST /solutions                  -> POST /crm/v6/Solutions (create training, admin)
//   PUT  /solutions/:id              -> PUT  /crm/v6/Solutions/:id (write back links, admin)
//   GET  /solutions/:id?fields=...   -> GET  /crm/v6/Solutions/:id?fields=...
//   GET  /accounts/search?q=         -> GET  /crm/v6/Accounts/search
//   POST /accounts                   -> POST /crm/v6/Accounts
//   GET  /deals/search                -> paginated GET /crm/v6/Deals, filtered locally
//   POST /deals                      -> POST /crm/v6/Deals  (creates application Deal)
//   PUT  /deals/:id                  -> PUT  /crm/v6/Deals/:id
//   PATCH /deals/:id/stage           -> PUT  /crm/v6/Deals/:id (Stage only)
//   POST /deals/:id/files?field=...  -> POST /crm/v6/Deals/:id/attachments (file upload)
//   GET  /contacts/search?q=         -> GET  /crm/v6/Contacts/search
//   POST /contacts                   -> POST /crm/v6/Contacts
//   GET  /training-plans/search?organised_by= -> GET /crm/v6/Training_Plans
//   GET  /users/search?email=        -> GET  /crm/v2/users
//   GET  /gelp-participants          -> stub, kept for compatibility
//   GET  /dashboard-data             -> latest dashboard_data.json from Catalyst File Store
//                                        (added for the Catalyst migration — the pipeline
//                                        Job writes here since Job and Client do not share
//                                        a filesystem; see functions/pipeline-job)
//
// Required environment variables (set via Catalyst console/CLI, not committed):
//   ZOHO_CLIENT_ID
//   ZOHO_CLIENT_SECRET
//   ZOHO_REFRESH_TOKEN
//
// Allowed origins (CORS) — update ALLOWED_ORIGINS once the Slate app's
// domain is confirmed; https://aa-ecosystem-tothdvfx.onslate.in is the
// current Development environment URL.

const zcatalyst = require('zcatalyst-sdk-node');

const CRM_BASE  = "https://www.zohoapis.in/crm/v6";
const USERS_URL = "https://www.zohoapis.in/crm/v2/users";
const TOKEN_URL = "https://accounts.zoho.in/oauth/v2/token";
const ALLOWED_ORIGINS = [
	"https://aa-ecosystem-tothdvfx.onslate.in",
	"https://aktivasia-portal.pages.dev", // retained during migration; remove once Cloudflare is fully retired
];

// NB: these Catalyst ids are strings, not numbers — they exceed
// Number.MAX_SAFE_INTEGER (17 digits vs. 2^53-1), so a numeric literal
// silently loses precision. The SDK accepts string ids for exactly this
// reason (see the Node zcatalyst-sdk-node type defs: id: string | number).
const PORTALDATA_FOLDER_ID = "56790000000031008";
const PIPELINE_STATE_TABLE_ID = "56790000000031021";
const DASHBOARD_STATE_KEY = "dashboard_data";

// ── Token cache (in-memory, per warm function instance) ───────────────────
let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
	if (cachedToken && Date.now() < tokenExpiresAt - 60_000) return cachedToken;

	const body = new URLSearchParams({
		grant_type: "refresh_token",
		client_id: process.env.ZOHO_CLIENT_ID,
		client_secret: process.env.ZOHO_CLIENT_SECRET,
		refresh_token: process.env.ZOHO_REFRESH_TOKEN,
	});

	const res = await fetch(TOKEN_URL, { method: "POST", body });
	const json = await res.json();

	if (!res.ok || !json.access_token) {
		throw new Error("Token refresh failed: " + JSON.stringify(json));
	}

	cachedToken = json.access_token;
	tokenExpiresAt = Date.now() + (json.expires_in ?? 3600) * 1000;
	return cachedToken;
}

// ── CORS helpers ────────────────────────────────────────────────────────
function corsHeaders(origin) {
	const allowed = ALLOWED_ORIGINS.includes(origin)
		|| (origin && /^http:\/\/localhost(:\d+)?$/.test(origin));
	return {
		"Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
		"Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
		"Access-Control-Max-Age": "86400",
	};
}

function sendJson(res, data, status, origin) {
	res.writeHead(status, {
		"Content-Type": "application/json",
		...corsHeaders(origin),
	});
	res.end(JSON.stringify(data));
}

function sendPreflight(res, origin) {
	res.writeHead(204, corsHeaders(origin));
	res.end();
}

// Read and JSON-parse the request body (raw Node http gives no built-in
// body parsing, unlike the Cloudflare Request object's request.json()).
function readJsonBody(req) {
	return new Promise((resolve, reject) => {
		let raw = "";
		req.on("data", (chunk) => { raw += chunk; });
		req.on("end", () => {
			if (!raw) return resolve({});
			try {
				resolve(JSON.parse(raw));
			} catch (err) {
				reject(err);
			}
		});
		req.on("error", reject);
	});
}

// ── Main handler ────────────────────────────────────────────────────────
module.exports = async (req, res) => {
	const origin = req.headers.origin ?? "";
	const url = new URL(req.url, "http://localhost"); // base is required, unused for routing
	const path = url.pathname;

	if (req.method === "OPTIONS") return sendPreflight(res, origin);

	try {
		// ── GET /dashboard-data ─────────────────────────────────────────
		// Serves the latest dashboard_data.json written by the pipeline
		// Job into Catalyst File Store. File Store has no public URL and
		// no "find file by name" — the pipeline Job tracks the current
		// file's id in the AA_Ecosystem_PipelineState Data Store table
		// (see functions/pipeline-job/filestore_upload.py), which this
		// route reads before downloading the file by that id.
		if (req.method === "GET" && path === "/dashboard-data") {
			const app = zcatalyst.initialize(req);
			const table = app.datastore().table(PIPELINE_STATE_TABLE_ID);

			let stateRow = null;
			for await (const row of table.getIterableRows()) {
				if (row.state_key === DASHBOARD_STATE_KEY) {
					stateRow = row;
					break;
				}
			}
			if (!stateRow) return sendJson(res, { error: "dashboard_data.json not yet generated" }, 404, origin);

			const folder = app.filestore().folder(PORTALDATA_FOLDER_ID);
			const buffer = await folder.downloadFile(stateRow.file_id);
			const data = JSON.parse(buffer.toString("utf-8"));
			return sendJson(res, data, 200, origin);
		}

		const token = await getAccessToken();
		const auth = { Authorization: `Zoho-oauthtoken ${token}` };

		// ── GET /solutions (list) ────────────────────────────────────────
		if (req.method === "GET" && path === "/solutions") {
			const fields = url.searchParams.get("fields") ?? "id,Solution_Title,Organised_By,Start_Date,End_Date,Training_Type";
			const page = url.searchParams.get("page") ?? "1";
			const crmUrl = `${CRM_BASE}/Solutions?fields=${fields}&per_page=50&page=${page}&sort_by=Modified_Time&sort_order=desc`;
			const crmRes = await fetch(crmUrl, { headers: auth });
			const body = await crmRes.json();
			return sendJson(res, body, crmRes.status, origin);
		}

		// ── POST /solutions ──────────────────────────────────────────────
		if (req.method === "POST" && path === "/solutions") {
			const payload = await readJsonBody(req);
			const crmRes = await fetch(`${CRM_BASE}/Solutions`, {
				method: "POST",
				headers: { ...auth, "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			const body = await crmRes.json();
			return sendJson(res, body, crmRes.status, origin);
		}

		// ── PUT /solutions/:id ───────────────────────────────────────────
		const solPutMatch = path.match(/^\/solutions\/([^/]+)$/);
		if (req.method === "PUT" && solPutMatch) {
			const id = solPutMatch[1];
			const payload = await readJsonBody(req);
			const crmRes = await fetch(`${CRM_BASE}/Solutions/${id}`, {
				method: "PUT",
				headers: { ...auth, "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			const body = await crmRes.json();
			return sendJson(res, body, crmRes.status, origin);
		}

		// ── GET /solutions/:id ───────────────────────────────────────────
		const solMatch = path.match(/^\/solutions\/([^/]+)$/);
		if (req.method === "GET" && solMatch) {
			const id = solMatch[1];
			const fields = url.searchParams.get("fields") ?? "";
			const crmUrl = `${CRM_BASE}/Solutions/${id}?fields=${fields}`;
			const crmRes = await fetch(crmUrl, { headers: auth });
			const body = await crmRes.json();
			return sendJson(res, body, crmRes.status, origin);
		}

		// ── GET /accounts/search?q= ──────────────────────────────────────
		if (req.method === "GET" && path === "/accounts/search") {
			const q = (url.searchParams.get("q") ?? "").trim();
			if (q.length < 2) return sendJson(res, { data: [] }, 200, origin);
			const searchUrl = `${CRM_BASE}/Accounts/search?word=${encodeURIComponent(q)}&fields=id,Account_Name&per_page=10`;
			const crmRes = await fetch(searchUrl, { headers: auth });
			const body = await crmRes.json();
			return sendJson(res, body, crmRes.status, origin);
		}

		// ── POST /accounts ───────────────────────────────────────────────
		if (req.method === "POST" && path === "/accounts") {
			const payload = await readJsonBody(req);
			const crmRes = await fetch(`${CRM_BASE}/Accounts`, {
				method: "POST",
				headers: { ...auth, "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			const body = await crmRes.json();
			return sendJson(res, body, crmRes.status, origin);
		}

		// ── GET /deals/search?training_id=&q= (or legacy &first=&last=) ──
		if (req.method === "GET" && path === "/deals/search") {
			const trainingId = url.searchParams.get("training_id") ?? "";
			const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
			const first = url.searchParams.get("first") ?? "";
			const last = url.searchParams.get("last") ?? "";
			const fields = "Deal_Name,First_Name,Last_Name,Email,Mobile,Account_Name,Training_Applied,Stage,Graduate_Date,Have_you_applied_the_training_to_run_more_effectiv,Custom_Responses";

			let allData = [];
			let page = 1;
			let more = true;
			while (more) {
				const crmRes = await fetch(`${CRM_BASE}/Deals?fields=${fields}&per_page=200&page=${page}`, { headers: auth });
				const body = await crmRes.json();
				const rows = body.data ?? [];
				allData.push(...rows);
				more = body.info?.more_records === true;
				page++;
			}

			let matches;
			if (q) {
				matches = allData.filter((d) => {
					if (d.Training_Applied?.id !== trainingId) return false;
					const fromParts = `${d.First_Name ?? ""} ${d.Last_Name ?? ""}`.trim();
					const fullName = (fromParts || d.Deal_Name || "").toLowerCase();
					const email = (d.Email ?? "").toLowerCase();
					return fullName.includes(q) || email.includes(q);
				});
			} else if (first || last) {
				const match = allData.find((d) =>
					d.Training_Applied?.id === trainingId &&
					d.First_Name?.toLowerCase() === first.toLowerCase() &&
					d.Last_Name?.toLowerCase() === last.toLowerCase()
				);
				matches = match ? [match] : [];
			} else {
				matches = allData.filter((d) => d.Training_Applied?.id === trainingId);
			}

			return sendJson(res, { data: matches }, 200, origin);
		}

		// ── POST /deals ──────────────────────────────────────────────────
		if (req.method === "POST" && path === "/deals") {
			const payload = await readJsonBody(req);
			const crmRes = await fetch(`${CRM_BASE}/Deals`, {
				method: "POST",
				headers: { ...auth, "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			const body = await crmRes.json();
			return sendJson(res, body, crmRes.status, origin);
		}

		// ── PUT /deals/:id ───────────────────────────────────────────────
		const dealPutMatch = path.match(/^\/deals\/([^/]+)$/);
		if (req.method === "PUT" && dealPutMatch) {
			const id = dealPutMatch[1];
			const payload = await readJsonBody(req);
			const crmRes = await fetch(`${CRM_BASE}/Deals/${id}`, {
				method: "PUT",
				headers: { ...auth, "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			const body = await crmRes.json();
			return sendJson(res, body, crmRes.status, origin);
		}

		// ── PATCH /deals/:id/stage ───────────────────────────────────────
		const dealStageMatch = path.match(/^\/deals\/([^/]+)\/stage$/);
		if (req.method === "PATCH" && dealStageMatch) {
			const id = dealStageMatch[1];
			const { Stage } = await readJsonBody(req);
			const crmRes = await fetch(`${CRM_BASE}/Deals/${id}`, {
				method: "PUT",
				headers: { ...auth, "Content-Type": "application/json" },
				body: JSON.stringify({ data: [{ Stage }] }),
			});
			const body = await crmRes.json();
			return sendJson(res, body, crmRes.status, origin);
		}

		// ── POST /deals/:id/files?field=... ──────────────────────────────
		// Stubbed: the application intake forms (apply-ph/pk/kr/id/regional.html)
		// that used this route are retired and no longer in active use, so
		// this was not ported. If a future feature needs it, the pattern is:
		// parse the incoming multipart body (e.g. with busboy, since raw
		// Node http has no built-in multipart parsing), then forward it as
		// a fresh multipart request to Zoho CRM's Attachments endpoint
		// using Node 18's built-in FormData/Blob. That also needs a
		// write-scoped Zoho refresh token — the current one is read-only
		// and this route will 401 against Zoho even once implemented.
		const fileMatch = path.match(/^\/deals\/([^/]+)\/files$/);
		if (req.method === "POST" && fileMatch) {
			return sendJson(res, { error: "File uploads via /deals/:id/files are not supported" }, 501, origin);
		}

		// ── GET /contacts/search?q= ──────────────────────────────────────
		if (req.method === "GET" && path === "/contacts/search") {
			const q = (url.searchParams.get("q") ?? "").trim();
			if (q.length < 2) return sendJson(res, { data: [] }, 200, origin);
			const searchUrl = `${CRM_BASE}/Contacts/search?word=${encodeURIComponent(q)}&fields=id,Full_Name,Email&per_page=10`;
			const crmRes = await fetch(searchUrl, { headers: auth });
			const body = await crmRes.json();
			return sendJson(res, body, crmRes.status, origin);
		}

		// ── POST /contacts ───────────────────────────────────────────────
		if (req.method === "POST" && path === "/contacts") {
			const payload = await readJsonBody(req);
			const crmRes = await fetch(`${CRM_BASE}/Contacts`, {
				method: "POST",
				headers: { ...auth, "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			const body = await crmRes.json();
			return sendJson(res, body, crmRes.status, origin);
		}

		// ── GET /training-plans/search?organised_by= ─────────────────────
		if (req.method === "GET" && path === "/training-plans/search") {
			const organisedBy = (url.searchParams.get("organised_by") ?? "").trim();
			const plansUrl = `${CRM_BASE}/Training_Plans?fields=id,Name,Organised_By,Start_Date,End_Date&per_page=200`;
			const crmRes = await fetch(plansUrl, { headers: auth });
			const body = await crmRes.json();
			if (!crmRes.ok) return sendJson(res, body, crmRes.status, origin);
			const plans = (body.data ?? [])
				.filter((p) => !organisedBy || p.Organised_By === organisedBy)
				.sort((a, b) => (b.Start_Date ?? "").localeCompare(a.Start_Date ?? ""));
			const more = body.info?.more_records ?? false;
			return sendJson(res, { data: plans, more_records: more }, 200, origin);
		}

		// ── GET /users/search?email= ──────────────────────────────────────
		if (req.method === "GET" && path === "/users/search") {
			const email = (url.searchParams.get("email") ?? "").trim();
			if (!email) return sendJson(res, { users: [] }, 200, origin);
			const usersUrl = `${USERS_URL}?type=AllUsers`;
			const crmRes = await fetch(usersUrl, { headers: auth });
			const body = await crmRes.json();
			const match = (body.users ?? []).find((u) => u.email?.toLowerCase() === email.toLowerCase());
			return sendJson(res, match ? { users: [match] } : { users: [] }, 200, origin);
		}

		// ── GET /gelp-participants ────────────────────────────────────────
		if (path === "/gelp-participants" && req.method === "GET") {
			return sendJson(res, [], 200, origin);
		}

		return sendJson(res, { error: "Not found" }, 404, origin);

	} catch (err) {
		return sendJson(res, { error: err.message }, 500, origin);
	}
};
