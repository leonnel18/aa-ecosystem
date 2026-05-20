// crm-proxy.js — Cloudflare Worker
// Proxies Zoho CRM API calls from the browser. Keeps OAuth credentials server-side.
//
// Routes handled:
//   GET  /solutions                  → GET  /crm/v6/Solutions (list, admin)
//   POST /solutions                  → POST /crm/v6/Solutions (create training, admin)
//   PUT  /solutions/:id              → PUT  /crm/v6/Solutions/:id (write back links, admin)
//   GET  /solutions/:id?fields=...   → GET  /crm/v6/Solutions/:id?fields=...
//   POST /deals                      → POST /crm/v6/Deals  (creates application Deal)
//   POST /deals/:id/files?field=...  → POST /crm/v6/Deals/:id/attachments (file upload)
//   GET  /gelp-participants           → GET  /crm/v6/Skill_Session_Participant (GELP intake list)
//
// Required Worker Secrets (set via wrangler secret put):
//   ZOHO_CLIENT_ID
//   ZOHO_CLIENT_SECRET
//   ZOHO_REFRESH_TOKEN
//
// Allowed origins (CORS):
//   https://aktivasia-portal.pages.dev
//   http://localhost:*  (local dev)

const CRM_BASE    = "https://www.zohoapis.in/crm/v6";
const USERS_URL   = "https://www.zohoapis.in/crm/v2/users";
const TOKEN_URL   = "https://accounts.zoho.in/oauth/v2/token";
const ALLOWED_ORIGINS = ["https://aktivasia-portal.pages.dev", "https://crm-proxy.gideon-valera.workers.dev"];

const GELP_SOLUTION_ID = "773031000008276089";

// ── Token cache (in-memory, per Worker instance) ──────────────────────────────
let cachedToken    = null;
let tokenExpiresAt = 0;

async function getAccessToken(env) {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) return cachedToken;

  const body = new URLSearchParams({
    grant_type:    "refresh_token",
    client_id:     env.ZOHO_CLIENT_ID,
    client_secret: env.ZOHO_CLIENT_SECRET,
    refresh_token: env.ZOHO_REFRESH_TOKEN,
  });

  const res  = await fetch(TOKEN_URL, { method: "POST", body });
  const json = await res.json();

  if (!res.ok || !json.access_token) {
    throw new Error("Token refresh failed: " + JSON.stringify(json));
  }

  cachedToken    = json.access_token;
  tokenExpiresAt = Date.now() + (json.expires_in ?? 3600) * 1000;
  return cachedToken;
}

// ── CORS helpers ──────────────────────────────────────────────────────────────
function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin)
    || (origin && /^http:\/\/localhost(:\d+)?$/.test(origin));
  return {
    "Access-Control-Allow-Origin":  allowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age":       "86400",
  };
}

function preflight(origin) {
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

function jsonResponse(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") ?? "";
    const url    = new URL(request.url);
    const path   = url.pathname;

    // Preflight
    if (request.method === "OPTIONS") return preflight(origin);

    try {
      const token = await getAccessToken(env);
      const auth  = { Authorization: `Zoho-oauthtoken ${token}` };

      // ── GET /solutions (list) ─────────────────────────────────────────────────
      if (request.method === "GET" && path === "/solutions") {
        const fields = url.searchParams.get("fields") ?? "id,Solution_Title,Organised_By,Start_Date,End_Date,Training_Type";
        const page   = url.searchParams.get("page") ?? "1";
        const crmUrl = `${CRM_BASE}/Solutions?fields=${fields}&per_page=50&page=${page}&sort_by=Modified_Time&sort_order=desc`;
        const crmRes = await fetch(crmUrl, { headers: auth });
        const body   = await crmRes.json();
        return jsonResponse(body, crmRes.status, origin);
      }

      // ── POST /solutions ───────────────────────────────────────────────────────
      if (request.method === "POST" && path === "/solutions") {
        const payload = await request.json();
        const crmRes  = await fetch(`${CRM_BASE}/Solutions`, {
          method:  "POST",
          headers: { ...auth, "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        });
        const body = await crmRes.json();
        return jsonResponse(body, crmRes.status, origin);
      }

      // ── PUT /solutions/:id ────────────────────────────────────────────────────
      const solPutMatch = path.match(/^\/solutions\/([^/]+)$/);
      if (request.method === "PUT" && solPutMatch) {
        const id      = solPutMatch[1];
        const payload = await request.json();
        const crmRes  = await fetch(`${CRM_BASE}/Solutions/${id}`, {
          method:  "PUT",
          headers: { ...auth, "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        });
        const body = await crmRes.json();
        return jsonResponse(body, crmRes.status, origin);
      }

      // ── GET /solutions/:id ────────────────────────────────────────────────────
      const solMatch = path.match(/^\/solutions\/([^/]+)$/);
      if (request.method === "GET" && solMatch) {
        const id     = solMatch[1];
        const fields = url.searchParams.get("fields") ?? "";
        const crmUrl = `${CRM_BASE}/Solutions/${id}?fields=${fields}`;
        const crmRes = await fetch(crmUrl, { headers: auth });
        const body   = await crmRes.json();
        return jsonResponse(body, crmRes.status, origin);
      }

      // ── GET /accounts/search?q= ──────────────────────────────────────────────
      if (request.method === "GET" && path === "/accounts/search") {
        const q = (url.searchParams.get("q") ?? "").trim();
        if (q.length < 2) return jsonResponse({ data: [] }, 200, origin);
        const searchUrl = `${CRM_BASE}/Accounts/search?word=${encodeURIComponent(q)}&fields=id,Account_Name&per_page=10`;
        const crmRes = await fetch(searchUrl, { headers: auth });
        const body   = await crmRes.json();
        return jsonResponse(body, crmRes.status, origin);
      }

      // ── POST /accounts ────────────────────────────────────────────────────────
      if (request.method === "POST" && path === "/accounts") {
        const payload = await request.json();
        const crmRes  = await fetch(`${CRM_BASE}/Accounts`, {
          method:  "POST",
          headers: { ...auth, "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        });
        const body = await crmRes.json();
        return jsonResponse(body, crmRes.status, origin);
      }

      // ── GET /deals/search?training_id=&q= (or legacy &first=&last=) ──────────
      if (request.method === "GET" && path === "/deals/search") {
        const trainingId = url.searchParams.get("training_id") ?? "";
        const q          = (url.searchParams.get("q") ?? "").trim().toLowerCase();
        const first      = url.searchParams.get("first") ?? "";
        const last       = url.searchParams.get("last") ?? "";
        const fields     = "First_Name,Last_Name,Email,Account_Name,Training_Applied,Stage,Graduate_Date,Have_you_applied_the_training_to_run_more_effectiv";

        // Paginate through all deals to find matches for this training
        let allData = [];
        let page = 1;
        let more = true;
        while (more) {
          const crmRes = await fetch(`${CRM_BASE}/Deals?fields=${fields}&per_page=200&page=${page}`, { headers: auth });
          const body   = await crmRes.json();
          const rows   = body.data ?? [];
          allData.push(...rows);
          more = body.info?.more_records === true;
          page++;
        }

        let matches;
        if (q) {
          matches = allData.filter(d => {
            if (d.Training_Applied?.id !== trainingId) return false;
            const fullName = `${d.First_Name ?? ""} ${d.Last_Name ?? ""}`.toLowerCase();
            const email    = (d.Email ?? "").toLowerCase();
            return fullName.includes(q) || email.includes(q);
          });
        } else if (first || last) {
          const match = allData.find(d =>
            d.Training_Applied?.id === trainingId &&
            d.First_Name?.toLowerCase() === first.toLowerCase() &&
            d.Last_Name?.toLowerCase()  === last.toLowerCase()
          );
          matches = match ? [match] : [];
        } else {
          matches = allData.filter(d => d.Training_Applied?.id === trainingId);
        }

        return jsonResponse({ data: matches }, 200, origin);
      }

      // ── POST /deals ───────────────────────────────────────────────────────────
      if (request.method === "POST" && path === "/deals") {
        const payload = await request.json();
        const crmRes  = await fetch(`${CRM_BASE}/Deals`, {
          method:  "POST",
          headers: { ...auth, "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        });
        const body = await crmRes.json();
        return jsonResponse(body, crmRes.status, origin);
      }

      // ── PUT /deals/:id ────────────────────────────────────────────────────────
      const dealPutMatch = path.match(/^\/deals\/([^/]+)$/);
      if (request.method === "PUT" && dealPutMatch) {
        const id      = dealPutMatch[1];
        const payload = await request.json();
        const crmRes  = await fetch(`${CRM_BASE}/Deals/${id}`, {
          method:  "PUT",
          headers: { ...auth, "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        });
        const body = await crmRes.json();
        return jsonResponse(body, crmRes.status, origin);
      }

      // ── PATCH /deals/:id/stage ────────────────────────────────────────────────
      const dealStageMatch = path.match(/^\/deals\/([^/]+)\/stage$/);
      if (request.method === "PATCH" && dealStageMatch) {
        const id      = dealStageMatch[1];
        const { Stage } = await request.json();
        const crmRes  = await fetch(`${CRM_BASE}/Deals/${id}`, {
          method:  "PUT",
          headers: { ...auth, "Content-Type": "application/json" },
          body:    JSON.stringify({ data: [{ Stage }] }),
        });
        const body = await crmRes.json();
        return jsonResponse(body, crmRes.status, origin);
      }

      // ── POST /deals/:id/files?field=... ───────────────────────────────────────
      const fileMatch = path.match(/^\/deals\/([^/]+)\/files$/);
      if (request.method === "POST" && fileMatch) {
        const dealId    = fileMatch[1];
        const fieldName = url.searchParams.get("field") ?? "Recent_Photo";
        const formData  = await request.formData();
        const file      = formData.get("file");

        if (!file) return jsonResponse({ error: "No file provided" }, 400, origin);

        // Forward as multipart to CRM attachments endpoint
        const crmForm = new FormData();
        crmForm.append("file", file, file.name);
        const crmRes = await fetch(`${CRM_BASE}/Deals/${dealId}/Attachments`, {
          method: "POST",
          headers: auth,
          body:   crmForm,
        });
        const body = await crmRes.json();
        return jsonResponse(body, crmRes.status, origin);
      }

      // ── GET /contacts/search?q= ──────────────────────────────────────────────
      if (request.method === "GET" && path === "/contacts/search") {
        const q = (url.searchParams.get("q") ?? "").trim();
        if (q.length < 2) return jsonResponse({ data: [] }, 200, origin);
        const searchUrl = `${CRM_BASE}/Contacts/search?word=${encodeURIComponent(q)}&fields=id,Full_Name,Email&per_page=10`;
        const crmRes = await fetch(searchUrl, { headers: auth });
        const body   = await crmRes.json();
        return jsonResponse(body, crmRes.status, origin);
      }

      // ── POST /contacts ────────────────────────────────────────────────────────
      if (request.method === "POST" && path === "/contacts") {
        const payload = await request.json();
        const crmRes  = await fetch(`${CRM_BASE}/Contacts`, {
          method:  "POST",
          headers: { ...auth, "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        });
        const body = await crmRes.json();
        return jsonResponse(body, crmRes.status, origin);
      }

      // ── GET /training-plans/search?organised_by= ─────────────────────────────
      if (request.method === "GET" && path === "/training-plans/search") {
        const organisedBy = (url.searchParams.get("organised_by") ?? "").trim();
        const plansUrl = `${CRM_BASE}/Training_Plans?fields=id,Name,Organised_By,Start_Date,End_Date&per_page=200`;
        const crmRes   = await fetch(plansUrl, { headers: auth });
        const body     = await crmRes.json();
        if (!crmRes.ok) return jsonResponse(body, crmRes.status, origin);
        const plans = (body.data ?? [])
          .filter(p => !organisedBy || p.Organised_By === organisedBy)
          .sort((a, b) => (b.Start_Date ?? "").localeCompare(a.Start_Date ?? ""));
        const more = body.info?.more_records ?? false;
        return jsonResponse({ data: plans, more_records: more }, 200, origin);
      }

      // ── GET /users/search?email= ──────────────────────────────────────────────
      if (request.method === "GET" && path === "/users/search") {
        const email = (url.searchParams.get("email") ?? "").trim();
        if (!email) return jsonResponse({ users: [] }, 200, origin);
        const usersUrl = `${USERS_URL}?type=AllUsers`; // v2 endpoint; no targeted search available so full list is pulled
        const crmRes   = await fetch(usersUrl, { headers: auth });
        const body     = await crmRes.json();
        const match    = (body.users ?? []).find(u => u.email?.toLowerCase() === email.toLowerCase());
        return jsonResponse(match ? { users: [match] } : { users: [] }, 200, origin);
      }

      // ── GET /gelp-participants ────────────────────────────────────────────────
      // Kept for future use; client now uses /deals/search directly to avoid
      // Zoho's 2000-record criteria pagination limit.
      if (path === "/gelp-participants" && request.method === "GET") {
        return jsonResponse([], 200, origin);
      }

      return jsonResponse({ error: "Not found" }, 404, origin);

    } catch (err) {
      return jsonResponse({ error: err.message }, 500, origin);
    }
  },
};
