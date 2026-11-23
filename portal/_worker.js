// _worker.js — Cloudflare Pages advanced-mode worker
//
// Serves two things from one deployment:
//   /api/*   → CRM proxy (Zoho CRM OAuth credentials stay server-side)
//   anything else → the static portal files (env.ASSETS)
//
// Replaces the old Catalyst `crm-proxy` function and portal/workers/crm-proxy.js.
// The portal calls /api/... on its own origin, so no cross-origin setup is needed.
//
// Secrets (Cloudflare dashboard → Pages → aktivasia-portal → Settings → Variables
// and Secrets, or `wrangler pages secret put <NAME> --project-name aktivasia-portal`):
//   ZOHO_CLIENT_ID
//   ZOHO_CLIENT_SECRET
//   ZOHO_REFRESH_TOKEN      (needs ZohoCRM.modules.ALL for the write routes)
// Optional plain variables:
//   ZOHO_API_DOMAIN         default https://www.zohoapis.in
//   ZOHO_ACCOUNTS_DOMAIN    default https://accounts.zoho.in
//
// Routes (path after /api):
//   GET   /solutions                       list trainings
//   POST  /solutions                       create training
//   GET   /solutions/:id?fields=           one training
//   PUT   /solutions/:id                   update training
//   GET   /accounts/search?q=              POST /accounts
//   GET   /deals/search?training_id=&q=    POST /deals   PUT /deals/:id
//   PATCH /deals/:id/stage                 POST /deals/:id/files?field=
//   GET   /contacts/search?q=              POST /contacts
//   GET   /training-plans/search?organised_by=
//   GET   /users/search?email=
//   GET   /gelp-participants               (stub, kept for compatibility)

const DEFAULT_API = "https://www.zohoapis.in";
const DEFAULT_ACCOUNTS = "https://accounts.zoho.in";

const ALLOWED_ORIGINS = [
  "https://portal.aktivasia.org",
  "https://aktivasia-portal.pages.dev",
];

// ── Token cache (per warm isolate) ─────────────────────────────────────────
let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken(env) {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) return cachedToken;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: env.ZOHO_CLIENT_ID,
    client_secret: env.ZOHO_CLIENT_SECRET,
    refresh_token: env.ZOHO_REFRESH_TOKEN,
  });
  const res = await fetch(`${env.ZOHO_ACCOUNTS_DOMAIN ?? DEFAULT_ACCOUNTS}/oauth/v2/token`, {
    method: "POST",
    body,
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) {
    throw new Error("Token refresh failed: " + JSON.stringify(json));
  }
  cachedToken = json.access_token;
  tokenExpiresAt = Date.now() + (json.expires_in ?? 3600) * 1000;
  return cachedToken;
}

// ── Response helpers ───────────────────────────────────────────────────────
function originAllowed(origin) {
  return ALLOWED_ORIGINS.includes(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin);
}

function corsHeaders(origin) {
  const h = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
  if (origin && originAllowed(origin)) h["Access-Control-Allow-Origin"] = origin;
  return h;
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

// ── API handler ────────────────────────────────────────────────────────────
async function handleApi(request, env, path) {
  const origin = request.headers.get("Origin") ?? "";
  const method = request.method;
  const url = new URL(request.url);

  if (method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });

  // Browsers always send Origin on cross-site writes. Reject writes from any
  // site other than ours (same-origin requests may omit it, which is fine).
  if (method !== "GET" && origin && !originAllowed(origin)) {
    return json({ error: "Origin not allowed" }, 403, origin);
  }

  const missing = ["ZOHO_CLIENT_ID", "ZOHO_CLIENT_SECRET", "ZOHO_REFRESH_TOKEN"].filter((k) => !env[k]);
  if (missing.length) return json({ error: "Server not configured: missing " + missing.join(", ") }, 500, origin);

  const API = env.ZOHO_API_DOMAIN ?? DEFAULT_API;
  const CRM = `${API}/crm/v6`;

  try {
    const token = await getAccessToken(env);
    const auth = { Authorization: `Zoho-oauthtoken ${token}` };

    // Forward a request to the CRM and relay status + JSON body.
    const crm = async (target, init = {}) => {
      const r = await fetch(target, { ...init, headers: { ...auth, ...(init.headers ?? {}) } });
      const text = await r.text();
      let body;
      try { body = text ? JSON.parse(text) : {}; } catch { body = { error: "Non-JSON response from CRM", raw: text.slice(0, 500) }; }
      return json(body, r.status, origin);
    };
    const writeJson = async (verb, target) => {
      const payload = await request.json();
      return crm(target, {
        method: verb,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    };

    // ── Solutions (trainings) ──────────────────────────────────────────────
    if (path === "/solutions") {
      if (method === "GET") {
        const fields = url.searchParams.get("fields") ?? "id,Solution_Title,Organised_By,Start_Date,End_Date,Training_Type";
        const page = url.searchParams.get("page") ?? "1";
        return crm(`${CRM}/Solutions?fields=${fields}&per_page=50&page=${page}&sort_by=Modified_Time&sort_order=desc`);
      }
      if (method === "POST") return writeJson("POST", `${CRM}/Solutions`);
    }
    const solMatch = path.match(/^\/solutions\/([^/]+)$/);
    if (solMatch) {
      if (method === "GET") return crm(`${CRM}/Solutions/${solMatch[1]}?fields=${url.searchParams.get("fields") ?? ""}`);
      if (method === "PUT") return writeJson("PUT", `${CRM}/Solutions/${solMatch[1]}`);
    }

    // ── Accounts (organisations) ───────────────────────────────────────────
    if (path === "/accounts/search" && method === "GET") {
      const q = (url.searchParams.get("q") ?? "").trim();
      if (q.length < 2) return json({ data: [] }, 200, origin);
      return crm(`${CRM}/Accounts/search?word=${encodeURIComponent(q)}&fields=id,Account_Name&per_page=10`);
    }
    if (path === "/accounts" && method === "POST") return writeJson("POST", `${CRM}/Accounts`);

    // ── Deals (applications) ───────────────────────────────────────────────
    if (path === "/deals/search" && method === "GET") {
      const trainingId = url.searchParams.get("training_id") ?? "";
      const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
      const first = url.searchParams.get("first") ?? "";
      const last = url.searchParams.get("last") ?? "";
      const fields = "Deal_Name,First_Name,Last_Name,Email,Mobile,Account_Name,Training_Applied,Stage,Graduate_Date,Have_you_applied_the_training_to_run_more_effectiv,Custom_Responses";

      // REST pagination (COQL is blocked by scope); filter locally.
      const all = [];
      for (let page = 1, more = true; more; page++) {
        const r = await fetch(`${CRM}/Deals?fields=${fields}&per_page=200&page=${page}`, { headers: auth });
        const body = await r.json();
        if (!r.ok) return json(body, r.status, origin);
        all.push(...(body.data ?? []));
        more = body.info?.more_records === true;
      }

      let matches;
      if (q) {
        matches = all.filter((d) => {
          if (d.Training_Applied?.id !== trainingId) return false;
          const fromParts = `${d.First_Name ?? ""} ${d.Last_Name ?? ""}`.trim();
          const fullName = (fromParts || d.Deal_Name || "").toLowerCase();
          return fullName.includes(q) || (d.Email ?? "").toLowerCase().includes(q);
        });
      } else if (first || last) {
        const m = all.find((d) =>
          d.Training_Applied?.id === trainingId &&
          d.First_Name?.toLowerCase() === first.toLowerCase() &&
          d.Last_Name?.toLowerCase() === last.toLowerCase());
        matches = m ? [m] : [];
      } else {
        matches = all.filter((d) => d.Training_Applied?.id === trainingId);
      }
      return json({ data: matches }, 200, origin);
    }
    if (path === "/deals" && method === "POST") return writeJson("POST", `${CRM}/Deals`);

    const dealMatch = path.match(/^\/deals\/([^/]+)$/);
    if (dealMatch && method === "PUT") return writeJson("PUT", `${CRM}/Deals/${dealMatch[1]}`);

    const stageMatch = path.match(/^\/deals\/([^/]+)\/stage$/);
    if (stageMatch && method === "PATCH") {
      const { Stage } = await request.json();
      return crm(`${CRM}/Deals/${stageMatch[1]}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [{ Stage }] }),
      });
    }

    const fileMatch = path.match(/^\/deals\/([^/]+)\/files$/);
    if (fileMatch && method === "POST") {
      const file = (await request.formData()).get("file");
      if (!file) return json({ error: "No file provided" }, 400, origin);
      const form = new FormData();
      form.append("file", file, file.name);
      return crm(`${CRM}/Deals/${fileMatch[1]}/Attachments`, { method: "POST", body: form });
    }

    // ── Contacts ───────────────────────────────────────────────────────────
    if (path === "/contacts/search" && method === "GET") {
      const q = (url.searchParams.get("q") ?? "").trim();
      if (q.length < 2) return json({ data: [] }, 200, origin);
      return crm(`${CRM}/Contacts/search?word=${encodeURIComponent(q)}&fields=id,Full_Name,Email&per_page=10`);
    }
    if (path === "/contacts" && method === "POST") return writeJson("POST", `${CRM}/Contacts`);

    // ── Training plans ─────────────────────────────────────────────────────
    if (path === "/training-plans/search" && method === "GET") {
      const organisedBy = (url.searchParams.get("organised_by") ?? "").trim();
      const r = await fetch(`${CRM}/Training_Plans?fields=id,Name,Organised_By,Start_Date,End_Date&per_page=200`, { headers: auth });
      const body = await r.json();
      if (!r.ok) return json(body, r.status, origin);
      const plans = (body.data ?? [])
        .filter((p) => !organisedBy || p.Organised_By === organisedBy)
        .sort((a, b) => (b.Start_Date ?? "").localeCompare(a.Start_Date ?? ""));
      return json({ data: plans, more_records: body.info?.more_records ?? false }, 200, origin);
    }

    // ── Users ──────────────────────────────────────────────────────────────
    if (path === "/users/search" && method === "GET") {
      const email = (url.searchParams.get("email") ?? "").trim();
      if (!email) return json({ users: [] }, 200, origin);
      const r = await fetch(`${API}/crm/v2/users?type=AllUsers`, { headers: auth });
      const body = await r.json();
      const match = (body.users ?? []).find((u) => u.email?.toLowerCase() === email.toLowerCase());
      return json({ users: match ? [match] : [] }, 200, origin);
    }

    if (path === "/gelp-participants" && method === "GET") return json([], 200, origin);

    return json({ error: "Not found" }, 404, origin);
  } catch (err) {
    return json({ error: err.message }, 500, origin);
  }
}

// ── Entry point ────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return handleApi(request, env, pathname.slice(4) || "/");
    }
    return env.ASSETS.fetch(request);
  },
};
