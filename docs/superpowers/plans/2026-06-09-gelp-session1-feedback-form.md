# GELP Session 1 Feedback Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Bahasa + English feedback form for GELP 2026 Mentorship Session 1, with optional workbook upload to Google Drive, a report page tracking responses, and a new `/drive/upload` route in the existing Cloudflare Worker.

**Architecture:** Five deliverables — the feedback form HTML, its JS, the report HTML, its JS, and a new route added to `portal/workers/crm-proxy.js`. The form follows the exact same 3-part flow as `mentorship-intake-id.html`: name search → questions → upload. Responses are written to the existing `Custom_Responses` CRM field using read-then-append so intake form answers are preserved.

**Tech Stack:** Vanilla HTML/CSS/JS, Cloudflare Workers (existing `crm-proxy.js`), Zoho CRM REST API, Google Drive REST API (service account JWT auth), SheetJS for Excel export.

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `portal/mentorship-session1-feedback-id.html` | Form HTML — banner, desc block, 3-part layout, success screen |
| Create | `portal/js/form-mentorship-session1-feedback-id.js` | Form logic — load participants, search, validate, upload, CRM write |
| Create | `portal/mentorship-session1-feedback-report-id.html` | Report HTML — KPI strip, tabs, table, download button |
| Create | `portal/js/report-mentorship-session1-feedback-id.js` | Report logic — fetch, parse, render, XLS export |
| Modify | `portal/workers/crm-proxy.js` | Add `POST /drive/upload` route with Google SA JWT auth |

---

## Task 1: Add `POST /drive/upload` to crm-proxy.js

**Files:**
- Modify: `portal/workers/crm-proxy.js`

This task adds Google Drive upload capability to the existing Cloudflare Worker. It requires a Google Service Account JSON key stored as a Worker secret (`GOOGLE_SERVICE_ACCOUNT_JSON`). The JWT signing uses the Web Crypto API available in the Workers runtime — no npm packages needed.

**Context on the existing worker:** `crm-proxy.js` exports a single `fetch` handler that routes on `path` and `request.method`. It already has `getAccessToken(env)` for Zoho with in-memory caching. We add a parallel `getDriveAccessToken(env)` for Google using the same cache pattern. Add the new route just before the final `return jsonResponse({ error: "Not found" }, 404, origin)` line.

- [ ] **Step 1: Add Google Drive token cache variables and `getDriveAccessToken` function**

Open `portal/workers/crm-proxy.js`. After the existing Zoho token cache variables (`let cachedToken` and `let tokenExpiresAt`), add:

```js
// ── Google Drive token cache ───────────────────────────────────────────────
let cachedDriveToken    = null;
let driveTokenExpiresAt = 0;

async function getDriveAccessToken(env) {
  if (cachedDriveToken && Date.now() < driveTokenExpiresAt - 60_000) return cachedDriveToken;

  const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/drive.file",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  // Encode JWT header + payload
  const header  = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" })).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
  const payload = btoa(JSON.stringify(claim)).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
  const sigInput = `${header}.${payload}`;

  // Import the RSA private key from the service account JSON
  const pemBody = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const keyBytes = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", keyBytes.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );

  // Sign
  const sigBytes = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(sigInput)
  );
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBytes)))
    .replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");

  const jwt = `${sigInput}.${sig}`;

  // Exchange JWT for access token
  const res  = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion:  jwt,
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) throw new Error("Drive token failed: " + JSON.stringify(json));

  cachedDriveToken    = json.access_token;
  driveTokenExpiresAt = Date.now() + (json.expires_in ?? 3600) * 1000;
  return cachedDriveToken;
}
```

- [ ] **Step 2: Add `POST /drive/upload` route**

Inside the `try` block of the main `fetch` handler, just before the final `return jsonResponse({ error: "Not found" }, 404, origin)` line, add:

```js
      // ── POST /drive/upload ────────────────────────────────────────────────
      if (request.method === "POST" && path === "/drive/upload") {
        const formData       = await request.formData();
        const file           = formData.get("file");
        const participantName = (formData.get("participant_name") ?? "Unknown").trim();

        if (!file) return jsonResponse({ ok: false, error: "No file provided" }, 400, origin);

        // Derive extension from original filename
        const originalName = file.name ?? "";
        const dotIdx       = originalName.lastIndexOf(".");
        const ext          = dotIdx !== -1 ? originalName.slice(dotIdx) : "";
        const targetName   = `GELP 2026 - Session 1 - ${participantName}${ext}`;

        const driveToken = await getDriveAccessToken(env);
        const FOLDER_ID  = "1oaw6qnOjzjRXgnL4v8Gj-l1HHtor7OON";

        // Multipart upload to Google Drive
        const boundary = "----DriveUploadBoundary";
        const metadata = JSON.stringify({ name: targetName, parents: [FOLDER_ID] });
        const fileBytes = await file.arrayBuffer();

        const metaPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`;
        const mediaPart = `--${boundary}\r\nContent-Type: ${file.type || "application/octet-stream"}\r\n\r\n`;
        const closing   = `\r\n--${boundary}--`;

        const metaBytes  = new TextEncoder().encode(metaPart);
        const mediaBytes = new TextEncoder().encode(mediaPart);
        const closeBytes = new TextEncoder().encode(closing);

        const body = new Uint8Array(metaBytes.length + mediaBytes.length + fileBytes.byteLength + closeBytes.length);
        body.set(metaBytes, 0);
        body.set(mediaBytes, metaBytes.length);
        body.set(new Uint8Array(fileBytes), metaBytes.length + mediaBytes.length);
        body.set(closeBytes, metaBytes.length + mediaBytes.length + fileBytes.byteLength);

        const driveRes = await fetch(
          "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
          {
            method:  "POST",
            headers: {
              Authorization:  `Bearer ${driveToken}`,
              "Content-Type": `multipart/related; boundary=${boundary}`,
            },
            body,
          }
        );
        const driveBody = await driveRes.json();
        if (!driveRes.ok) return jsonResponse({ ok: false, error: driveBody }, driveRes.status, origin);
        return jsonResponse({ ok: true, fileId: driveBody.id }, 200, origin);
      }
```

- [ ] **Step 3: Update the route comment header at the top of the file**

The file has a comment block listing all routes. Add this line to it:

```js
//   POST /drive/upload              → upload file to Google Drive (service account)
```

Also add the new secret to the secrets comment:

```js
//   GOOGLE_SERVICE_ACCOUNT_JSON
```

- [ ] **Step 4: Commit**

```bash
git add portal/workers/crm-proxy.js
git commit -m "feat: add POST /drive/upload route to crm-proxy for Google Drive uploads"
```

> **One-time setup (do before deploying):**
> 1. In Google Cloud Console → IAM → Service Accounts → create a service account
> 2. Create a JSON key for it → download the JSON file
> 3. Share the Drive folder `1oaw6qnOjzjRXgnL4v8Gj-l1HHtor7OON` with the service account email (Editor role)
> 4. Run: `cd portal/workers && npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON` and paste the entire JSON content
> 5. Deploy: `npx wrangler pages deploy portal --project-name aktivasia-portal` (or `wrangler deploy` for the worker)

---

## Task 2: Feedback Form HTML (`mentorship-session1-feedback-id.html`)

**Files:**
- Create: `portal/mentorship-session1-feedback-id.html`

Copy the structure of `portal/mentorship-intake-id.html` exactly — same CSS variables, same header, same section-card styles, same nav-buttons, same success screen. Only the content differs.

- [ ] **Step 1: Create the HTML file**

Create `portal/mentorship-session1-feedback-id.html` with this full content:

```html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Formulir Umpan Balik Sesi 1 — GELP 2026</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --primary: #821545;
      --primary-light: #f3e8ff;
      --cta-start: #ff960b;
      --cta-end: #f93a3a;
      --bg: #f5f4ee;
      --white: #ffffff;
      --text: #131625;
      --meta: #788099;
      --border: #e2e0d8;
      --radius: 16px;
      --radius-sm: 10px;
      --input-h: 52px;
    }

    body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); font-size: 16px; line-height: 1.5; }

    .site-header { background: var(--white); border-bottom: 1px solid var(--border); padding: 12px 20px; display: flex; align-items: center; gap: 16px; }
    .header-logos { display: flex; align-items: center; gap: 12px; }
    .header-logos img { height: 36px; width: auto; display: block; }

    .training-banner { background: linear-gradient(135deg, var(--primary) 0%, #5a0e30 100%); color: var(--white); padding: 28px 20px 24px; }
    .training-banner .type-pill { display: inline-block; border: 1.5px solid rgba(255,255,255,0.4); border-radius: 9999px; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; padding: 4px 12px; margin-bottom: 12px; opacity: 0.9; }
    .training-banner h1 { font-size: 24px; font-weight: 800; line-height: 1.25; }
    @media (min-width: 640px) { .training-banner { padding: 36px 40px 28px; } .training-banner h1 { font-size: 30px; } }

    .desc-block { background: var(--white); border-bottom: 1px solid var(--border); padding: 24px 20px; }
    @media (min-width: 640px) { .desc-block { padding: 28px 40px; } }
    .desc-block .desc-body { font-size: 15px; line-height: 1.75; color: var(--text); }
    .desc-block .desc-body p { margin-bottom: 0.7em; }
    .desc-block .desc-body p:last-child { margin-bottom: 0; }
    .desc-block .desc-body ul { padding-left: 1.4em; margin-top: 0.5em; }
    .desc-block .desc-body li { margin-bottom: 0.3em; }

    .form-wrap { padding: 20px 16px 100px; max-width: 640px; margin: 0 auto; }
    @media (min-width: 640px) { .form-wrap { padding: 24px 24px 100px; } }

    .section-card { background: var(--white); border-radius: var(--radius); padding: 24px 20px; margin-bottom: 16px; }
    @media (min-width: 640px) { .section-card { padding: 32px 28px; } }
    .section-title { font-size: 22px; font-weight: 800; margin-bottom: 4px; color: var(--text); }
    .section-subtitle { font-size: 14px; color: var(--meta); margin-bottom: 20px; opacity: 0.75; }

    .search-wrap { position: relative; margin-bottom: 6px; }
    .search-wrap input { width: 100%; min-height: var(--input-h); border: 1.5px solid var(--border); border-radius: var(--radius-sm); padding: 12px 14px; font-family: inherit; font-size: 16px; color: var(--text); background: var(--white); transition: border-color 0.2s; }
    .search-wrap input:focus { outline: none; border-color: var(--primary); }

    .name-results { display: none; position: absolute; left: 0; right: 0; top: calc(100% + 4px); background: var(--white); border: 1.5px solid var(--border); border-radius: var(--radius-sm); box-shadow: 0 4px 16px rgba(0,0,0,.10); max-height: 240px; overflow-y: auto; z-index: 200; }
    .name-results.open { display: block; }
    .name-result-item { padding: 12px 16px; cursor: pointer; font-size: 15px; color: var(--text); border-bottom: 1px solid var(--border); transition: background 0.15s; }
    .name-result-item:last-child { border-bottom: none; }
    .name-result-item:hover { background: var(--primary-light); color: var(--primary); font-weight: 600; }

    .selected-name-tag { display: none; align-items: center; gap: 8px; margin-top: 8px; padding: 10px 14px; background: var(--primary-light); border: 1.5px solid var(--primary); border-radius: var(--radius-sm); font-size: 14px; font-weight: 600; color: var(--primary); }
    .selected-name-tag.visible { display: flex; }
    .selected-name-tag .clear-btn { background: none; border: none; color: var(--primary); font-size: 18px; cursor: pointer; margin-left: auto; padding: 0; line-height: 1; }

    .field { margin-bottom: 20px; }
    .field-label { font-size: 14px; font-weight: 600; margin-bottom: 2px; display: block; }
    .field-label-en { font-size: 12px; color: var(--meta); margin-bottom: 6px; display: block; font-style: italic; }
    .field-label .req { color: var(--primary); margin-left: 2px; }

    textarea { width: 100%; min-height: 110px; border: 1.5px solid var(--border); border-radius: var(--radius-sm); padding: 12px 14px; font-family: inherit; font-size: 16px; color: var(--text); background: var(--white); resize: vertical; transition: border-color 0.2s; }
    textarea:focus { outline: none; border-color: var(--primary); }

    /* File upload */
    .file-upload-area { border: 2px dashed var(--border); border-radius: var(--radius-sm); padding: 20px; text-align: center; cursor: pointer; transition: border-color 0.2s; }
    .file-upload-area:hover { border-color: var(--primary); }
    .file-upload-area input[type="file"] { display: none; }
    .file-upload-label { font-size: 14px; color: var(--meta); cursor: pointer; }
    .file-upload-label span { color: var(--primary); font-weight: 600; text-decoration: underline; }

    .field-error { font-size: 12px; color: #e53e3e; margin-top: 4px; display: none; }
    .field.has-error textarea, .field.has-error input { border-color: #e53e3e; }
    .field.has-error .field-error { display: block; }

    .status-msg { text-align: center; font-size: 14px; color: var(--meta); padding: 20px 0; }
    .status-msg.error { color: #e53e3e; }

    .nav-buttons { position: fixed; bottom: 0; left: 0; right: 0; background: var(--white); border-top: 1px solid var(--border); padding: 16px 20px; display: flex; gap: 12px; max-width: 640px; margin: 0 auto; flex-wrap: wrap; }
    .btn { flex: 1; min-height: 52px; border-radius: 9999px; font-size: 15px; font-weight: 700; border: none; cursor: pointer; transition: opacity 0.2s; font-family: inherit; }
    .btn:active { opacity: 0.85; }
    .btn-back { background: var(--bg); color: var(--text); border: 1.5px solid var(--border); }
    .btn-next { background: linear-gradient(135deg, var(--cta-start), var(--cta-end)); color: var(--white); }
    .btn-submit { background: linear-gradient(135deg, var(--primary), #5a0e30); color: var(--white); }
    .btn-submit-no-file { background: var(--bg); color: var(--text); border: 1.5px solid var(--border); font-size: 13px; }
    .btn:disabled { opacity: 0.4; cursor: not-allowed; }

    .spinner { display: inline-block; width: 18px; height: 18px; border: 3px solid rgba(255,255,255,0.4); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; vertical-align: middle; margin-right: 8px; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .success-screen { display: none; text-align: center; padding: 60px 24px; max-width: 480px; margin: 0 auto; }
    .success-screen .icon { font-size: 56px; margin-bottom: 20px; }
    .success-screen h2 { font-size: 24px; font-weight: 800; margin-bottom: 12px; }
    .success-screen p { color: var(--meta); font-size: 15px; line-height: 1.6; }

    .hidden { display: none !important; }
  </style>
</head>
<body>

<header class="site-header">
  <div class="header-logos">
    <img src="img/koneksi-aa-logo.png" alt="Koneksi &amp; AktivAsia">
  </div>
</header>

<div class="training-banner">
  <div class="type-pill">Formulir Umpan Balik / Session Feedback Form</div>
  <h1>Formulir Umpan Balik — Sesi Mentorship 1 GELP 2026</h1>
  <p style="font-size:14px;opacity:0.75;margin-top:8px;font-style:italic">Session 1 Feedback Form — GELP 2026 Mentorship Program</p>
</div>

<div class="desc-block">
  <div class="desc-body">
    <p>🎯 Kami mengundang Anda untuk berbagi umpan balik mengenai Sesi Mentorship 1 GELP 2026 yang berlangsung pada 6 Juni 2026.<br><em>We invite you to share feedback on GELP 2026 Mentorship Session 1 held on June 6, 2026.</em></p>
    <p>📋 Masukan Anda sangat berarti untuk membantu kami mempersiapkan sesi berikutnya dengan lebih baik.<br><em>Your feedback helps us prepare better for the next session.</em></p>
    <ul>
      <li>✅ Hanya untuk peserta <strong>GELP 2026</strong> / For GELP 2026 participants only</li>
      <li>✏️ Semua pertanyaan wajib diisi / All questions are required</li>
      <li>📎 Upload workbook Anda (opsional) / Upload your workbook (optional)</li>
    </ul>
  </div>
</div>

<!-- Part 1: Name Search -->
<div class="form-wrap" id="part-1">
  <div class="section-card">
    <div class="section-title">Cari Nama Anda</div>
    <div class="section-subtitle">Search your name to get started</div>

    <div id="loading-msg" class="status-msg">Memuat daftar peserta… / Loading participant list…</div>
    <div id="error-msg" class="status-msg error hidden">Gagal memuat data. Silakan muat ulang halaman. / Failed to load data. Please reload the page.</div>

    <div id="search-area" class="hidden">
      <div class="field" id="field-name">
        <label class="field-label" for="name-search">Nama Lengkap <span class="req">*</span></label>
        <span class="field-label-en">Full Name — ketik untuk mencari / type to search</span>
        <div class="search-wrap">
          <input type="text" id="name-search" placeholder="Ketik nama Anda… / Type your name…" autocomplete="off">
          <div id="name-results" class="name-results" role="listbox"></div>
        </div>
        <div id="selected-name-tag" class="selected-name-tag" role="status" aria-live="polite">
          <span id="selected-name-text"></span>
          <button type="button" class="clear-btn" id="clear-name-btn" aria-label="Clear selection">×</button>
        </div>
        <div class="field-error" id="name-error">Silakan pilih nama Anda dari daftar. / Please select your name from the list.</div>
      </div>
      <p style="font-size:13px;color:var(--meta);margin-top:-8px">Nama tidak ada di daftar? Hubungi tim AktivAsia Indonesia Anda. / Name not in the list? Contact your AktivAsia Indonesia team.</p>
    </div>
  </div>
</div>

<!-- Part 2: Feedback Questions -->
<div class="form-wrap hidden" id="part-2">
  <div class="section-card">
    <div class="section-title">Umpan Balik Sesi</div>
    <div class="section-subtitle">Session Feedback</div>

    <div class="field" id="field-q-overall">
      <label class="field-label" for="q-overall">1. Bagaimana penilaian Anda secara keseluruhan terhadap sesi ini? <span class="req">*</span></label>
      <span class="field-label-en">How would you rate the session overall?</span>
      <textarea id="q-overall" rows="4" placeholder="Ceritakan secara singkat… / Describe briefly…"></textarea>
      <div class="field-error">Mohon isi pertanyaan ini. / Please answer this question.</div>
    </div>

    <div class="field" id="field-q-plenary">
      <label class="field-label" for="q-plenary">2. Apa yang paling Anda sukai dari Sesi Pleno? <span class="req">*</span></label>
      <span class="field-label-en">What did you enjoy most about the Plenary Session?</span>
      <textarea id="q-plenary" rows="4" placeholder="Ceritakan secara singkat… / Describe briefly…"></textarea>
      <div class="field-error">Mohon isi pertanyaan ini. / Please answer this question.</div>
    </div>

    <div class="field" id="field-q-breakout">
      <label class="field-label" for="q-breakout">3. Apa yang paling Anda sukai dari Sesi Kelompok (Breakout)? <span class="req">*</span></label>
      <span class="field-label-en">What did you enjoy most about the Breakout Session?</span>
      <textarea id="q-breakout" rows="4" placeholder="Ceritakan secara singkat… / Describe briefly…"></textarea>
      <div class="field-error">Mohon isi pertanyaan ini. / Please answer this question.</div>
    </div>

    <div class="field" id="field-q-improvement">
      <label class="field-label" for="q-improvement">4. Apa yang dapat kami tingkatkan untuk sesi berikutnya? <span class="req">*</span></label>
      <span class="field-label-en">What can we improve for the next session?</span>
      <textarea id="q-improvement" rows="4" placeholder="Ceritakan secara singkat… / Describe briefly…"></textarea>
      <div class="field-error">Mohon isi pertanyaan ini. / Please answer this question.</div>
    </div>

    <div class="field" id="field-q-other">
      <label class="field-label" for="q-other">5. Apakah ada masukan lain yang ingin Anda bagikan? <span class="req">*</span></label>
      <span class="field-label-en">Any other feedback you'd like to share?</span>
      <textarea id="q-other" rows="4" placeholder="Ceritakan secara singkat… / Describe briefly…"></textarea>
      <div class="field-error">Mohon isi pertanyaan ini. / Please answer this question.</div>
    </div>

    <div id="submit-error-p2" class="status-msg error hidden">Terjadi kesalahan. Silakan coba lagi. / Something went wrong. Please try again.</div>
  </div>
</div>

<!-- Part 3: Workbook Upload -->
<div class="form-wrap hidden" id="part-3">
  <div class="section-card">
    <div class="section-title">Upload Workbook Anda</div>
    <div class="section-subtitle">Upload Your Workbook</div>

    <div class="desc-body" style="margin-bottom:20px;font-size:15px;line-height:1.75">
      <p>📓 Wawasan dari workbook Anda sangat membantu kami mempersiapkan materi dan sesi mentorship berikutnya secara lebih personal.<br><em>Insights from your workbook help us tailor and prepare the next mentorship session more personally.</em></p>
      <p style="margin-top:12px">Silakan upload workbook Anda di bawah ini <strong>(opsional)</strong>.<br><em>Please upload your workbook below (optional).</em></p>
    </div>

    <div class="file-upload-area" id="file-upload-area" onclick="document.getElementById('file-input').click()">
      <input type="file" id="file-input">
      <div class="file-upload-label">Klik untuk memilih file / <span>Click to choose a file</span></div>
      <div style="font-size:12px;color:var(--meta);margin-top:6px">PDF, DOCX, JPG, atau format lainnya / PDF, DOCX, JPG, or any format</div>
    </div>

    <div id="selected-file-tag" class="selected-name-tag" style="margin-top:12px">
      <span id="selected-file-text"></span>
      <button type="button" class="clear-btn" id="clear-file-btn" aria-label="Clear file">×</button>
    </div>

    <div id="upload-error" class="status-msg error hidden">Gagal mengupload file. Silakan coba lagi. / File upload failed. Please try again.</div>
  </div>
</div>

<!-- Success screen -->
<div class="success-screen" id="success-screen">
  <div class="icon">🎉</div>
  <h2>Terima kasih atas umpan balik Anda!</h2>
  <p>Thank you for your feedback!<br><br>Masukan Anda telah berhasil disimpan dan akan membantu kami mempersiapkan sesi berikutnya.<br><em>Your responses have been saved and will help us prepare the next session.</em></p>
</div>

<!-- Navigation -->
<div class="nav-buttons" id="nav-buttons">
  <button class="btn btn-back hidden" id="btn-back">← Back</button>
  <button class="btn btn-next" id="btn-next" disabled>Lanjut / Continue →</button>
  <button class="btn btn-submit hidden" id="btn-next-to-upload">Lanjut / Continue →</button>
  <button class="btn btn-submit-no-file hidden" id="btn-submit-no-file">Kirim tanpa lampiran / Submit without attachment</button>
  <button class="btn btn-submit hidden" id="btn-submit-with-file">Kirim dengan lampiran / Submit with attachment</button>
</div>

<script src="js/form-mentorship-session1-feedback-id.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add portal/mentorship-session1-feedback-id.html
git commit -m "feat: add GELP Session 1 feedback form HTML skeleton"
```

---

## Task 3: Feedback Form JS (`form-mentorship-session1-feedback-id.js`)

**Files:**
- Create: `portal/js/form-mentorship-session1-feedback-id.js`

This is the core logic file. It handles:
1. Fetching eligible participants (same API call as intake form, but also stores `Custom_Responses` per participant)
2. Typeahead name search
3. Part 1 → Part 2 → Part 3 navigation
4. Validation of Part 2 fields
5. Optional Drive file upload (Part 3)
6. Read-then-append CRM write

- [ ] **Step 1: Create the JS file**

Create `portal/js/form-mentorship-session1-feedback-id.js` with this full content:

```js
const PROXY_BASE      = "https://crm-proxy.gideon-valera.workers.dev";
const GELP_TRAINING_ID = "773031000008276089";
const GELP_STAGES = new Set([
  "Selected",
  "Attended Training",
  "Graduated or Post Evaluation Completed",
]);

// participant shape: { id, name, customResponses }
let allParticipants    = [];
let selectedParticipant = null;
let selectedFile        = null;
let isSubmitting        = false;

// ── DOM refs — Part 1 ──────────────────────────────────────────────────────
const part1        = document.getElementById("part-1");
const loadingMsg   = document.getElementById("loading-msg");
const errorMsg     = document.getElementById("error-msg");
const searchArea   = document.getElementById("search-area");
const nameSearch   = document.getElementById("name-search");
const nameResults  = document.getElementById("name-results");
const nameTag      = document.getElementById("selected-name-tag");
const nameTagText  = document.getElementById("selected-name-text");
const clearNameBtn = document.getElementById("clear-name-btn");
const fieldName    = document.getElementById("field-name");

// ── DOM refs — Part 2 ──────────────────────────────────────────────────────
const part2        = document.getElementById("part-2");
const submitErrP2  = document.getElementById("submit-error-p2");

// ── DOM refs — Part 3 ──────────────────────────────────────────────────────
const part3           = document.getElementById("part-3");
const fileInput       = document.getElementById("file-input");
const fileTag         = document.getElementById("selected-file-tag");
const fileTagText     = document.getElementById("selected-file-text");
const clearFileBtn    = document.getElementById("clear-file-btn");
const uploadError     = document.getElementById("upload-error");

// ── DOM refs — nav ─────────────────────────────────────────────────────────
const navButtons       = document.getElementById("nav-buttons");
const btnBack          = document.getElementById("btn-back");
const btnNext          = document.getElementById("btn-next");
const btnNextToUpload  = document.getElementById("btn-next-to-upload");
const btnSubmitNoFile  = document.getElementById("btn-submit-no-file");
const btnSubmitWithFile = document.getElementById("btn-submit-with-file");
const successScreen    = document.getElementById("success-screen");

// ── Part 1: Load participants ──────────────────────────────────────────────

async function loadParticipants() {
  try {
    const res  = await fetch(`${PROXY_BASE}/deals/search?training_id=${GELP_TRAINING_ID}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    allParticipants = (json.data ?? [])
      .filter((d) => GELP_STAGES.has(d.Stage))
      .map((d) => ({
        id:              d.id,
        name:            `${d.First_Name ?? ""} ${d.Last_Name ?? ""}`.trim(),
        customResponses: (d.Custom_Responses ?? "").trim(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    loadingMsg.classList.add("hidden");
    searchArea.classList.remove("hidden");
  } catch (e) {
    loadingMsg.classList.add("hidden");
    errorMsg.classList.remove("hidden");
  }
}

// ── Part 1: Typeahead ──────────────────────────────────────────────────────

nameSearch.addEventListener("input", () => {
  const q = nameSearch.value.trim().toLowerCase();
  if (selectedParticipant && nameSearch.value !== selectedParticipant.name) clearSelection();
  renderResults(q);
});

nameSearch.addEventListener("focus", () => {
  const q = nameSearch.value.trim().toLowerCase();
  if (q.length > 0) renderResults(q);
});

document.addEventListener("click", (e) => {
  if (!nameSearch.contains(e.target) && !nameResults.contains(e.target)) {
    nameResults.classList.remove("open");
  }
});

clearNameBtn.addEventListener("click", () => {
  clearSelection();
  nameSearch.value = "";
  nameSearch.focus();
});

function clearSelection() {
  selectedParticipant = null;
  nameTag.classList.remove("visible");
  nameTagText.textContent = "";
  btnNext.disabled = true;
}

function renderResults(q) {
  nameResults.innerHTML = "";
  if (!q) { nameResults.classList.remove("open"); return; }
  const matches = allParticipants.filter((p) => p.name.toLowerCase().includes(q));
  if (matches.length === 0) { nameResults.classList.remove("open"); return; }
  matches.forEach((p) => {
    const item = document.createElement("div");
    item.className = "name-result-item";
    item.setAttribute("role", "option");
    item.textContent = p.name;
    item.addEventListener("click", () => selectParticipant(p));
    nameResults.appendChild(item);
  });
  nameResults.classList.add("open");
}

function selectParticipant(p) {
  selectedParticipant = p;
  nameSearch.value    = p.name;
  nameResults.classList.remove("open");
  nameTagText.textContent = p.name;
  nameTag.classList.add("visible");
  fieldName.classList.remove("has-error");
  btnNext.disabled = false;
}

// ── Navigation: Part 1 → Part 2 ───────────────────────────────────────────

btnNext.addEventListener("click", () => {
  if (!selectedParticipant) { fieldName.classList.add("has-error"); return; }
  showPart(2);
});

// ── Navigation: Part 2 → Part 3 ───────────────────────────────────────────

btnNextToUpload.addEventListener("click", () => {
  if (!validatePart2()) return;
  showPart(3);
});

// ── Navigation: Part 3 → Part 2 (back) ────────────────────────────────────

btnBack.addEventListener("click", () => {
  const current = getCurrentPart();
  if (current === 2) showPart(1);
  if (current === 3) showPart(2);
});

function getCurrentPart() {
  if (!part1.classList.contains("hidden")) return 1;
  if (!part2.classList.contains("hidden")) return 2;
  return 3;
}

function showPart(n) {
  part1.classList.toggle("hidden", n !== 1);
  part2.classList.toggle("hidden", n !== 2);
  part3.classList.toggle("hidden", n !== 3);

  btnBack.classList.toggle("hidden", n === 1);
  btnNext.classList.toggle("hidden", n !== 1);
  btnNextToUpload.classList.toggle("hidden", n !== 2);
  btnSubmitNoFile.classList.toggle("hidden", n !== 3);
  btnSubmitWithFile.classList.toggle("hidden", n !== 3);

  submitErrP2.classList.add("hidden");
  uploadError.classList.add("hidden");
  window.scrollTo(0, 0);
}

// ── Part 2: Validation ─────────────────────────────────────────────────────

function validatePart2() {
  let valid = true;
  ["q-overall", "q-plenary", "q-breakout", "q-improvement", "q-other"].forEach((id) => {
    const textarea = document.getElementById(id);
    const field    = document.getElementById(`field-${id}`);
    if (!textarea.value.trim()) {
      field.classList.add("has-error");
      valid = false;
    } else {
      field.classList.remove("has-error");
    }
  });
  return valid;
}

// ── Part 3: File input ─────────────────────────────────────────────────────

fileInput.addEventListener("change", () => {
  const f = fileInput.files[0];
  if (!f) return;
  selectedFile = f;
  fileTagText.textContent = f.name;
  fileTag.classList.add("visible");
  uploadError.classList.add("hidden");
});

clearFileBtn.addEventListener("click", () => {
  selectedFile = null;
  fileInput.value = "";
  fileTag.classList.remove("visible");
  fileTagText.textContent = "";
});

// ── Submit: without file ───────────────────────────────────────────────────

btnSubmitNoFile.addEventListener("click", async () => {
  if (isSubmitting) return;
  await doSubmit(false);
});

// ── Submit: with file ──────────────────────────────────────────────────────

btnSubmitWithFile.addEventListener("click", async () => {
  if (isSubmitting) return;
  if (!selectedFile) {
    // No file chosen — treat same as submit without file
    await doSubmit(false);
    return;
  }
  await doSubmit(true);
});

// ── Core submit logic ──────────────────────────────────────────────────────

async function doSubmit(withFile) {
  isSubmitting = true;
  uploadError.classList.add("hidden");
  submitErrP2.classList.add("hidden");

  const activeBtn = withFile ? btnSubmitWithFile : btnSubmitNoFile;
  activeBtn.disabled = true;
  activeBtn.innerHTML = '<span class="spinner"></span>Menyimpan…';

  let workbookUploaded = false;

  if (withFile && selectedFile) {
    try {
      const fd = new FormData();
      fd.append("file", selectedFile, selectedFile.name);
      fd.append("participant_name", selectedParticipant.name);
      const upRes = await fetch(`${PROXY_BASE}/drive/upload`, { method: "POST", body: fd });
      const upJson = await upRes.json();
      if (!upRes.ok || !upJson.ok) throw new Error(JSON.stringify(upJson));
      workbookUploaded = true;
    } catch (e) {
      uploadError.classList.remove("hidden");
      activeBtn.disabled = false;
      activeBtn.textContent = withFile
        ? "Kirim dengan lampiran / Submit with attachment"
        : "Kirim tanpa lampiran / Submit without attachment";
      isSubmitting = false;
      return;
    }
  }

  // Build feedback block
  const overall     = document.getElementById("q-overall").value.trim();
  const plenary     = document.getElementById("q-plenary").value.trim();
  const breakout    = document.getElementById("q-breakout").value.trim();
  const improvement = document.getElementById("q-improvement").value.trim();
  const other       = document.getElementById("q-other").value.trim();

  const feedbackBlock = buildFeedbackBlock(overall, plenary, breakout, improvement, other, workbookUploaded);

  // Read-then-append: strip any existing feedback block from stored Custom_Responses
  const existingRaw   = selectedParticipant.customResponses;
  const feedbackStart = existingRaw.indexOf("[Keseluruhan]");
  const strippedBase  = feedbackStart !== -1
    ? existingRaw.slice(0, feedbackStart).trimEnd()
    : existingRaw;
  const merged = strippedBase ? `${strippedBase}\n\n${feedbackBlock}` : feedbackBlock;

  try {
    const crmRes = await fetch(`${PROXY_BASE}/deals/${selectedParticipant.id}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ data: [{ Custom_Responses: merged }] }),
    });
    if (!crmRes.ok) throw new Error(`HTTP ${crmRes.status}`);
    part3.classList.add("hidden");
    navButtons.classList.add("hidden");
    successScreen.style.display = "block";
    window.scrollTo(0, 0);
  } catch (e) {
    uploadError.classList.remove("hidden");
    activeBtn.disabled = false;
    activeBtn.textContent = withFile
      ? "Kirim dengan lampiran / Submit with attachment"
      : "Kirim tanpa lampiran / Submit without attachment";
  } finally {
    isSubmitting = false;
  }
}

function buildFeedbackBlock(overall, plenary, breakout, improvement, other, workbookUploaded) {
  let block =
    `[Keseluruhan]\n${overall}\n\n` +
    `[Sesi Pleno]\n${plenary}\n\n` +
    `[Sesi Kelompok]\n${breakout}\n\n` +
    `[Saran Perbaikan]\n${improvement}\n\n` +
    `[Masukan Lainnya]\n${other}`;
  if (workbookUploaded) block += `\n\n[Workbook]\nuploaded`;
  return block;
}

// ── Init ───────────────────────────────────────────────────────────────────

loadParticipants();
```

- [ ] **Step 2: Commit**

```bash
git add portal/js/form-mentorship-session1-feedback-id.js
git commit -m "feat: add GELP Session 1 feedback form JS — load, search, validate, upload, CRM write"
```

---

## Task 4: Report HTML (`mentorship-session1-feedback-report-id.html`)

**Files:**
- Create: `portal/mentorship-session1-feedback-report-id.html`

Copy structure from `portal/mentorship-intake-report-id.html`. The only differences are: the banner text, column headers in the Answered table (5 feedback columns + Workbook column instead of 4 intake columns), and the page title.

- [ ] **Step 1: Create the report HTML file**

Create `portal/mentorship-session1-feedback-report-id.html` with this full content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GELP Session 1 Feedback Report — AktivAsia</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script src="https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root { --primary: #821545; --primary-light: #f3e8ff; --cta-start: #ff960b; --cta-end: #f93a3a; --bg: #f5f4ee; --white: #ffffff; --text: #131625; --meta: #788099; --border: #e2e0d8; --radius: 16px; --radius-sm: 10px; }
    body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); font-size: 16px; line-height: 1.5; }
    .site-header { background: var(--white); border-bottom: 1px solid var(--border); padding: 12px 20px; display: flex; align-items: center; gap: 16px; }
    .header-logos { display: flex; align-items: center; gap: 12px; }
    .header-logos img { height: 36px; width: auto; display: block; }
    .training-banner { background: linear-gradient(135deg, var(--primary) 0%, #5a0e30 100%); color: var(--white); padding: 28px 20px 24px; }
    @media (min-width: 640px) { .training-banner { padding: 36px 40px 28px; } }
    .training-banner .type-pill { display: inline-block; border: 1.5px solid rgba(255,255,255,0.4); border-radius: 9999px; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; padding: 4px 12px; margin-bottom: 12px; opacity: 0.9; }
    .training-banner h1 { font-size: 24px; font-weight: 800; line-height: 1.25; }
    @media (min-width: 640px) { .training-banner h1 { font-size: 30px; } }
    .training-banner .subtitle { font-size: 14px; opacity: 0.75; margin-top: 8px; font-style: italic; }
    .refreshed { font-size: 12px; opacity: 0.6; margin-top: 10px; }
    .kpi-strip { background: var(--white); border-bottom: 1px solid var(--border); padding: 16px 20px; display: flex; gap: 12px; flex-wrap: wrap; }
    @media (min-width: 640px) { .kpi-strip { padding: 16px 40px; } }
    .kpi-pill { background: var(--bg); border: 1.5px solid var(--border); border-radius: 9999px; padding: 8px 18px; font-size: 13px; font-weight: 600; color: var(--text); display: flex; align-items: center; gap: 6px; }
    .kpi-pill .kpi-val { font-size: 18px; font-weight: 800; color: var(--primary); }
    .kpi-pill .kpi-pct { font-size: 11px; font-weight: 500; color: var(--meta); }
    .controls-bar { padding: 14px 20px; display: flex; justify-content: flex-end; }
    @media (min-width: 640px) { .controls-bar { padding: 14px 40px; } }
    .btn-download { background: linear-gradient(135deg, var(--cta-start), var(--cta-end)); color: var(--white); border: none; border-radius: 9999px; padding: 10px 22px; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; transition: opacity 0.2s; }
    .btn-download:hover { opacity: 0.9; }
    .tab-nav { display: flex; gap: 0; border-bottom: 2px solid var(--border); padding: 0 20px; background: var(--white); }
    @media (min-width: 640px) { .tab-nav { padding: 0 40px; } }
    .tab-btn { background: none; border: none; border-bottom: 3px solid transparent; margin-bottom: -2px; padding: 14px 20px; font-family: inherit; font-size: 14px; font-weight: 600; color: var(--meta); cursor: pointer; transition: color 0.15s, border-color 0.15s; display: flex; align-items: center; gap: 8px; }
    .tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); }
    .tab-badge { background: var(--bg); border: 1.5px solid var(--border); border-radius: 9999px; font-size: 11px; font-weight: 700; padding: 1px 8px; color: var(--text); }
    .tab-btn.active .tab-badge { background: var(--primary-light); border-color: var(--primary); color: var(--primary); }
    .page-wrap { padding: 24px 20px 60px; max-width: 1200px; margin: 0 auto; }
    @media (min-width: 640px) { .page-wrap { padding: 28px 40px 60px; } }
    .tab-panel { display: none; }
    .tab-panel.active { display: block; }
    .section-card { background: var(--white); border-radius: var(--radius); padding: 0; overflow: hidden; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    thead th { background: var(--bg); color: var(--meta); font-size: 11px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; padding: 12px 16px; text-align: left; white-space: nowrap; border-bottom: 1.5px solid var(--border); }
    tbody tr { border-bottom: 1px solid var(--border); }
    tbody tr:last-child { border-bottom: none; }
    tbody tr:hover { background: #fafaf7; }
    tbody td { padding: 12px 16px; vertical-align: top; color: var(--text); line-height: 1.5; }
    td.num { color: var(--meta); font-size: 12px; width: 40px; }
    td.answer { max-width: 200px; }
    .answer-text { display: inline; }
    .answer-toggle { background: none; border: none; color: var(--primary); font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; padding: 0; margin-left: 4px; white-space: nowrap; }
    .answer-toggle:hover { text-decoration: underline; }
    .workbook-badge { display: inline-block; border-radius: 9999px; font-size: 11px; font-weight: 700; padding: 3px 10px; background: #e6f4ea; color: #2e7d32; border: 1.5px solid #a5d6a7; white-space: nowrap; }
    .status-msg { text-align: center; font-size: 14px; color: var(--meta); padding: 48px 24px; }
    .status-msg.error { color: #e53e3e; }
    .btn-retry { background: none; border: 1.5px solid var(--border); border-radius: 9999px; padding: 8px 20px; font-family: inherit; font-size: 13px; font-weight: 600; color: var(--text); cursor: pointer; margin-top: 12px; }
    .btn-retry:hover { border-color: var(--primary); color: var(--primary); }
    .spinner { display: inline-block; width: 18px; height: 18px; border: 3px solid rgba(130,21,69,0.2); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.7s linear infinite; vertical-align: middle; margin-right: 8px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state { text-align: center; padding: 48px 24px; color: var(--meta); font-size: 14px; }
    .hidden { display: none !important; }
  </style>
</head>
<body>

<header class="site-header">
  <div class="header-logos">
    <img src="img/koneksi-aa-logo.png" alt="Koneksi &amp; AktivAsia">
  </div>
</header>

<div class="training-banner">
  <div class="type-pill">GELP 2026 · Indonesia</div>
  <h1>GELP Session 1 Feedback Report</h1>
  <p class="subtitle">Response tracking for GELP 2026 Mentorship Session 1</p>
  <p class="refreshed" id="refreshed-at"></p>
</div>

<div class="kpi-strip">
  <div class="kpi-pill"><span>Total</span><span class="kpi-val" id="kpi-total">—</span></div>
  <div class="kpi-pill"><span>Answered</span><span class="kpi-val" id="kpi-answered">—</span><span class="kpi-pct" id="kpi-pct"></span></div>
  <div class="kpi-pill"><span>Not Answered</span><span class="kpi-val" id="kpi-unanswered">—</span></div>
</div>

<div class="controls-bar">
  <button class="btn-download" id="btn-download" disabled>⬇ Download Excel</button>
</div>

<div class="tab-nav">
  <button class="tab-btn active" data-tab="answered">Answered <span class="tab-badge" id="badge-answered">0</span></button>
  <button class="tab-btn" data-tab="unanswered">Not Answered <span class="tab-badge" id="badge-unanswered">0</span></button>
</div>

<div class="page-wrap">
  <div id="state-loading" class="section-card">
    <div class="status-msg"><span class="spinner"></span>Loading participant data…</div>
  </div>
  <div id="state-error" class="section-card hidden">
    <div class="status-msg error">Failed to load data. Please try again.<br><button class="btn-retry" id="btn-retry">Retry</button></div>
  </div>

  <div class="tab-panel active" id="panel-answered">
    <div class="section-card hidden" id="table-answered-wrap">
      <div class="table-wrap">
        <table id="table-answered">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Keseluruhan</th>
              <th>Sesi Pleno</th>
              <th>Sesi Kelompok</th>
              <th>Saran Perbaikan</th>
              <th>Masukan Lainnya</th>
              <th>Workbook</th>
            </tr>
          </thead>
          <tbody id="tbody-answered"></tbody>
        </table>
      </div>
    </div>
    <div class="section-card hidden" id="empty-answered">
      <div class="empty-state">No participants have answered yet.</div>
    </div>
  </div>

  <div class="tab-panel" id="panel-unanswered">
    <div class="section-card hidden" id="table-unanswered-wrap">
      <div class="table-wrap">
        <table id="table-unanswered">
          <thead>
            <tr><th>#</th><th>Name</th><th>Email</th><th>Mobile</th></tr>
          </thead>
          <tbody id="tbody-unanswered"></tbody>
        </table>
      </div>
    </div>
    <div class="section-card hidden" id="empty-unanswered">
      <div class="empty-state">All participants have answered!</div>
    </div>
  </div>
</div>

<script src="js/report-mentorship-session1-feedback-id.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add portal/mentorship-session1-feedback-report-id.html
git commit -m "feat: add GELP Session 1 feedback report HTML skeleton"
```

---

## Task 5: Report JS (`report-mentorship-session1-feedback-id.js`)

**Files:**
- Create: `portal/js/report-mentorship-session1-feedback-id.js`

Follows the exact same pattern as `portal/js/report-mentorship-intake-id.js`. Key differences:
- Answered detection key: `[Keseluruhan]` (not `[Fokus Penelitian]`)
- Parsed bracket keys: `Keseluruhan`, `Sesi Pleno`, `Sesi Kelompok`, `Saran Perbaikan`, `Masukan Lainnya`, `Workbook`
- Answered table has 6 data columns (5 feedback + Workbook badge)
- XLS filename: `GELP_Session1_Feedback_Report_{date}.xlsx`

- [ ] **Step 1: Create the report JS file**

Create `portal/js/report-mentorship-session1-feedback-id.js` with this full content:

```js
const PROXY_BASE       = "https://crm-proxy.gideon-valera.workers.dev";
const GELP_TRAINING_ID = "773031000008276089";
const TRUNCATE_LEN     = 100;

const ELIGIBLE_STAGES = new Set([
  "Selected",
  "Attended Training",
  "Graduated or Post Evaluation Completed",
]);

const Q_KEYS  = ["Keseluruhan", "Sesi Pleno", "Sesi Kelompok", "Saran Perbaikan", "Masukan Lainnya", "Workbook"];
const Q_PROPS = ["q1", "q2", "q3", "q4", "q5", "workbook"];

// ── State ──────────────────────────────────────────────────────────────────
let answeredList   = [];  // [{ name, q1, q2, q3, q4, q5, workbook }]
let unansweredList = [];  // [{ name, email, mobile }]

// ── DOM refs ───────────────────────────────────────────────────────────────
const stateLoading        = document.getElementById("state-loading");
const stateError          = document.getElementById("state-error");
const btnRetry            = document.getElementById("btn-retry");
const btnDownload         = document.getElementById("btn-download");
const kpiTotal            = document.getElementById("kpi-total");
const kpiAnswered         = document.getElementById("kpi-answered");
const kpiPct              = document.getElementById("kpi-pct");
const kpiUnanswered       = document.getElementById("kpi-unanswered");
const badgeAnswered       = document.getElementById("badge-answered");
const badgeUnanswered     = document.getElementById("badge-unanswered");
const refreshedAt         = document.getElementById("refreshed-at");
const tbodyAnswered       = document.getElementById("tbody-answered");
const tbodyUnanswered     = document.getElementById("tbody-unanswered");
const tableAnsweredWrap   = document.getElementById("table-answered-wrap");
const tableUnansweredWrap = document.getElementById("table-unanswered-wrap");
const emptyAnswered       = document.getElementById("empty-answered");
const emptyUnanswered     = document.getElementById("empty-unanswered");

// ── Tab switching ──────────────────────────────────────────────────────────
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`panel-${btn.dataset.tab}`).classList.add("active");
  });
});

// ── Fetch ──────────────────────────────────────────────────────────────────
async function loadData() {
  stateLoading.classList.remove("hidden");
  stateError.classList.add("hidden");
  tableAnsweredWrap.classList.add("hidden");
  tableUnansweredWrap.classList.add("hidden");
  emptyAnswered.classList.add("hidden");
  emptyUnanswered.classList.add("hidden");
  btnDownload.disabled = true;

  try {
    const res  = await fetch(`${PROXY_BASE}/deals/search?training_id=${GELP_TRAINING_ID}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    processDeals(json.data ?? []);
  } catch (e) {
    console.error("Failed to load GELP feedback data:", e);
    stateLoading.classList.add("hidden");
    stateError.classList.remove("hidden");
  }
}

// ── Process & classify ─────────────────────────────────────────────────────
function processDeals(deals) {
  answeredList   = [];
  unansweredList = [];

  const sorted = [...deals].sort((a, b) => {
    const na = `${a.First_Name ?? ""} ${a.Last_Name ?? ""}`.trim();
    const nb = `${b.First_Name ?? ""} ${b.Last_Name ?? ""}`.trim();
    return na.localeCompare(nb);
  });

  for (const d of sorted) {
    if (!ELIGIBLE_STAGES.has(d.Stage ?? "")) continue;
    const name  = `${d.First_Name ?? ""} ${d.Last_Name ?? ""}`.trim();
    const email  = d.Email ?? "";
    const mobile = d.Mobile ?? "";
    const raw    = (d.Custom_Responses ?? "").trim();

    // Answered = Custom_Responses contains the feedback form's first key
    if (raw.includes("[Keseluruhan]")) {
      answeredList.push({ name, ...parseResponses(raw) });
    } else {
      unansweredList.push({ name, email, mobile });
    }
  }

  renderAll();
}

// ── Parse Custom_Responses ─────────────────────────────────────────────────
function parseResponses(raw) {
  const result = { q1: "", q2: "", q3: "", q4: "", q5: "", workbook: "" };

  for (let i = 0; i < Q_KEYS.length; i++) {
    const header = `[${Q_KEYS[i]}]`;
    const start  = raw.indexOf(header);
    if (start === -1) continue;
    const contentStart = start + header.length;
    const nextHeader   = i + 1 < Q_KEYS.length ? raw.indexOf(`[${Q_KEYS[i + 1]}]`) : -1;
    const end          = nextHeader === -1 ? raw.length : nextHeader;
    result[Q_PROPS[i]] = raw.slice(contentStart, end).trim();
  }

  return result;
}

// ── Render ─────────────────────────────────────────────────────────────────
function renderAll() {
  stateLoading.classList.add("hidden");
  stateError.classList.add("hidden");

  const total = answeredList.length + unansweredList.length;
  const pct   = total > 0 ? Math.round((answeredList.length / total) * 100) : 0;

  kpiTotal.textContent      = total;
  kpiAnswered.textContent   = answeredList.length;
  kpiPct.textContent        = `${pct}%`;
  kpiUnanswered.textContent = unansweredList.length;
  badgeAnswered.textContent  = answeredList.length;
  badgeUnanswered.textContent = unansweredList.length;
  refreshedAt.textContent   = `Last refreshed: ${new Date().toLocaleString()}`;

  renderAnsweredTable();
  renderUnansweredTable();
  btnDownload.disabled = false;
}

function renderAnsweredTable() {
  tbodyAnswered.innerHTML = "";

  if (answeredList.length === 0) {
    emptyAnswered.classList.remove("hidden");
    tableAnsweredWrap.classList.add("hidden");
    return;
  }

  answeredList.forEach((p, i) => {
    const tr = document.createElement("tr");
    const workbookCell = p.workbook === "uploaded"
      ? `<span class="workbook-badge">✓ Diunggah</span>`
      : `<span style="color:var(--meta);font-size:12px">—</span>`;
    tr.innerHTML = `
      <td class="num">${i + 1}</td>
      <td><strong>${esc(p.name)}</strong></td>
      ${["q1","q2","q3","q4","q5"].map((q) => `<td class="answer">${renderAnswerCell(p[q])}</td>`).join("")}
      <td>${workbookCell}</td>
    `;
    tbodyAnswered.appendChild(tr);
  });

  tableAnsweredWrap.classList.remove("hidden");
  emptyAnswered.classList.add("hidden");

  tbodyAnswered.querySelectorAll(".answer-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cell = btn.closest("td");
      const span = cell.querySelector(".answer-text");
      if (btn.dataset.expanded === "1") {
        span.innerHTML     = btn.dataset.short + "… ";
        btn.textContent    = "▼ Read more";
        btn.dataset.expanded = "0";
      } else {
        span.innerHTML     = btn.dataset.full + " ";
        btn.textContent    = "▲ Show less";
        btn.dataset.expanded = "1";
      }
    });
  });
}

function renderAnswerCell(text) {
  if (!text) return `<span style="color:var(--meta);font-size:12px">—</span>`;
  if (text.length <= TRUNCATE_LEN) return `<span class="answer-text">${esc(text)}</span>`;
  const short = text.slice(0, TRUNCATE_LEN);
  return `<span class="answer-text">${esc(short)}… </span><button class="answer-toggle" data-full="${esc(text)}" data-short="${esc(short)}" data-expanded="0">▼ Read more</button>`;
}

function renderUnansweredTable() {
  tbodyUnanswered.innerHTML = "";

  if (unansweredList.length === 0) {
    emptyUnanswered.classList.remove("hidden");
    tableUnansweredWrap.classList.add("hidden");
    return;
  }

  unansweredList.forEach((p, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="num">${i + 1}</td>
      <td><strong>${esc(p.name)}</strong></td>
      <td>${p.email ? `<a href="mailto:${esc(p.email)}" style="color:var(--primary)">${esc(p.email)}</a>` : `<span style="color:var(--meta);font-size:12px">—</span>`}</td>
      <td>${p.mobile ? esc(p.mobile) : `<span style="color:var(--meta);font-size:12px">—</span>`}</td>
    `;
    tbodyUnanswered.appendChild(tr);
  });

  tableUnansweredWrap.classList.remove("hidden");
  emptyUnanswered.classList.add("hidden");
}

// ── HTML escape ────────────────────────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── XLS Download ───────────────────────────────────────────────────────────
btnDownload.addEventListener("click", () => {
  const wb = XLSX.utils.book_new();

  const answeredRows = [
    ["Name", "Keseluruhan", "Sesi Pleno", "Sesi Kelompok", "Saran Perbaikan", "Masukan Lainnya", "Workbook Uploaded"],
    ...answeredList.map((p) => [p.name, p.q1, p.q2, p.q3, p.q4, p.q5, p.workbook === "uploaded" ? "Yes" : "No"]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(answeredRows), "Answered");

  const unansweredRows = [
    ["Name", "Email", "Mobile"],
    ...unansweredList.map((p) => [p.name, p.email, p.mobile]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(unansweredRows), "Not Answered");

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `GELP_Session1_Feedback_Report_${date}.xlsx`);
});

// ── Retry ──────────────────────────────────────────────────────────────────
btnRetry.addEventListener("click", loadData);

// ── Init ───────────────────────────────────────────────────────────────────
loadData();
```

- [ ] **Step 2: Commit**

```bash
git add portal/js/report-mentorship-session1-feedback-id.js
git commit -m "feat: add GELP Session 1 feedback report JS — fetch, parse, render, XLS export"
```

---

## Task 6: Deploy Worker and Portal

- [ ] **Step 1: Deploy the updated crm-proxy worker**

```bash
cd portal/workers
npx wrangler deploy
```

Expected output: `✓ Deployed crm-proxy ...`

> If `GOOGLE_SERVICE_ACCOUNT_JSON` secret has not been set yet, do that first:
> ```bash
> npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
> # Paste the full JSON content of the service account key file when prompted
> ```

- [ ] **Step 2: Deploy the portal to Cloudflare Pages**

```bash
npx wrangler pages deploy portal --project-name aktivasia-portal
```

Expected output: `✓ Deployment complete! ...`

- [ ] **Step 3: Smoke-test the feedback form**

Open `https://aktivasia-portal.pages.dev/mentorship-session1-feedback-id.html` in a browser:
1. Search for a participant name — confirm typeahead works and "Lanjut" enables
2. Fill all 5 questions — confirm "Lanjut" navigates to Part 3
3. Skip workbook upload — click "Kirim tanpa lampiran" — confirm success screen appears
4. Open `mentorship-session1-feedback-report-id.html` — confirm the participant now appears in the Answered tab

- [ ] **Step 4: Smoke-test the Drive upload (optional — requires secret set)**

Fill the form again with a different test participant, attach any file in Part 3, click "Kirim dengan lampiran". Then check the Drive folder `1oaw6qnOjzjRXgnL4v8Gj-l1HHtor7OON` — file should appear renamed as `GELP 2026 - Session 1 - {name}.{ext}`.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: deploy GELP Session 1 feedback form and report"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|---|---|
| Form in Bahasa + English | Task 2 (HTML labels + subtitles) |
| Name search filter (stage-based) | Task 3 (`GELP_STAGES` filter in `loadParticipants`) |
| 5 open-text feedback questions | Task 2 (HTML) + Task 3 (validation + payload) |
| Optional workbook upload | Task 3 (`doSubmit(withFile)` + Part 3 HTML in Task 2) |
| Drive upload via `/drive/upload` | Task 1 (`crm-proxy.js` new route) |
| File renamed `GELP 2026 - Session 1 - {name}.{ext}` | Task 1 (`targetName` logic) |
| Read-then-append CRM write | Task 3 (`strippedBase` + `merged` logic) |
| `[Workbook]` flag appended when uploaded | Task 3 (`buildFeedbackBlock`) |
| Report: Answered/Not Answered tabs | Tasks 4 + 5 |
| Report: Workbook column with green badge | Tasks 4 + 5 (`workbook-badge` class) |
| Report: Not Answered includes non-intake-form respondents | Task 5 (detection by `[Keseluruhan]` only) |
| Report: KPI strip | Tasks 4 + 5 |
| Report: Excel export (2 sheets) | Task 5 (`btnDownload` listener) |
| XLS filename `GELP_Session1_Feedback_Report_{date}.xlsx` | Task 5 |

**Placeholder scan:** None found. All code blocks are complete.

**Type consistency:** `selectedParticipant` shape `{ id, name, customResponses }` defined in Task 3 `loadParticipants` and consumed in `doSubmit` — consistent. `Q_PROPS` array `["q1","q2","q3","q4","q5","workbook"]` defined and consumed in `parseResponses` and `renderAnsweredTable` — consistent.
