# Design: Migrate aa-ecosystem from Cloudflare to Zoho Catalyst

**Date:** 2026-08-09
**Status:** Approved — ready for implementation plan

## Problem

A Catalyst deploy attempt failed with `npm error Missing script: "build"`. Root cause: Catalyst's Slate deployer runs `npm run build` against the repo root by default. The root `package.json` only declares `playwright` (a screenshot-tooling dependency for `tools/screenshot_portal.js`) and has no `scripts.build`. More fundamentally, this repo has **no Catalyst project structure at all** — it was built entirely around Cloudflare Pages (static portal) + Cloudflare Workers (`portal/workers/crm-proxy.js`) + a locally-run Python pipeline. A no-op build script would silence the error but Catalyst would still have nothing meaningful to serve.

Decision: fully migrate off Cloudflare. Catalyst becomes the only host for the static portal, the CRM proxy, and the CRM data pipeline.

## Scope

In scope:
1. Static portal (`portal/`) → Catalyst Client component
2. CRM proxy (`portal/workers/crm-proxy.js`) → Catalyst Advanced I/O Function (Node.js)
3. CRM data pipeline (`tools/orchestrator.py` and its dependents) → Catalyst Scheduled Job (Python runtime)

Out of scope (explicitly deferred):
- `tools/gmail_sender.py` / `tools/reminder_engine.py` — revisit in a follow-up pass once this migration is live.
- Resolving the conflict between `crm-proxy.js` performing live writes (POST/PUT/PATCH to Deals, Solutions, Accounts, Contacts) and CLAUDE.md's Invariant #1 ("READ-ONLY on Zoho CRM... ever"). The proxy's existing write behavior will be ported as-is, unchanged. This conflict is flagged here for the record but not resolved by this migration.
- Zoho Analytics push (`analytics_push.py`) — already deferred per CLAUDE.md architecture notes; unaffected by this migration.

## Architecture

### 1. Client: static portal

Serves `portal/` unchanged — HTML/CSS/JS plus `portal/data/dashboard_data.json`. No changes to portal JS or HTML required. Catalyst expects static assets under a `client/` directory per its project layout, so `portal/` content moves (or the Catalyst manifest points) there.

### 2. Function: CRM proxy

`crm-proxy.js` ports to a Catalyst Advanced I/O Function with minimal changes:
- Handler signature changes from Cloudflare's `export default { fetch(request, env) }` to Catalyst's Advanced I/O request/response signature.
- All route logic, CORS handling, and Zoho token-refresh caching logic are preserved as-is.
- Secrets (`ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`) move from `wrangler secret put` to Catalyst environment variables. **The user will set these values directly in the Catalyst console/CLI** — Claude does not read or transmit live credential values as part of this migration.
- `ALLOWED_ORIGINS` CORS allowlist updates from `aktivasia-portal.pages.dev` to the new Catalyst-issued Client domain (exact domain confirmed once the Client component is provisioned).

### 3. Scheduled Job: CRM data pipeline

`tools/orchestrator.py` (extract → transform → write) runs as a Catalyst Job on a Python runtime, triggered by Catalyst's Cron/Job Scheduler (matching today's on-demand/scheduled run pattern — exact cadence TBD by user preference, default to daily).

Behavior change required: `orchestrator.py` currently ends with:
```python
shutil.copy2(out, portal_data_path)  # local filesystem copy into portal/data/
```
This local-filesystem copy assumes Job and Client share a filesystem, which Catalyst does not guarantee. This step is replaced with a write via Catalyst's file storage API so the Client component serves the freshly generated `dashboard_data.json` on next portal load.

Dependencies (`requirements.txt`: `zohocrmsdk8_0`, `requests`, `python-dotenv`, `pandas`, `google-auth-oauthlib`, `google-api-python-client`) install via the Python Function's dependency manifest — no code changes needed to the extract/transform logic itself, since it already reads/writes local JSON under `.tmp/` and `data/`.

Zoho CRM credentials (`ZOHO_CRM_CLIENT_ID/SECRET/REFRESH_TOKEN/REDIRECT_URI/REGION`) currently read from `.env` via `python-dotenv` move to Catalyst environment variables for this Job, same self-service pattern as the proxy Function.

## Data flow (after migration)

```
Catalyst Cron trigger
  → Job (Python): crm_extract → transform → data_writer
  → writes dashboard_data.json into Client's static folder
  → Client serves portal/ + dashboard_data.json to browsers

Browser → Client (static portal)
Browser → Function (crm-proxy) → Zoho CRM API  [live reads AND writes — ported as-is]
```

## Repo structure change

Catalyst requires a `catalyst.json` project manifest plus a defined folder per component. Target layout:

```
catalyst.json
client/              ← was portal/ (static assets)
functions/
  crm-proxy/         ← was portal/workers/crm-proxy.js
  pipeline-job/       ← was tools/{orchestrator,crm_extract,transform,data_writer,crm_auth}.py
```

This is the largest structural change in the migration — existing files move rather than being rewritten wholesale.

## Testing

- Client: manual smoke test of each portal HTML page after deploy, confirm `dashboard_data.json` loads.
- Function: exercise each route (`/solutions`, `/deals`, `/deals/search`, `/accounts/search`, etc.) against a Catalyst-hosted URL, same way `crm-proxy.js` is exercised today.
- Job: manual trigger of the scheduled Job once deployed, confirm `dashboard_data.json` updates in the Client's static folder and matches a local `orchestrator.py` run's output.

## Open items for the implementation plan

- Exact Catalyst CLI/console steps to scaffold `catalyst.json`, Client, Advanced I/O Function, and Job components (to be resolved during planning/implementation, since this depends on the Catalyst CLI version available).
- Cron cadence for the scheduled Job (default: daily, pending user confirmation).
- Exact mechanism for the Job to write into the Client's static folder (Catalyst file store API vs. redeploying Client assets) — to be confirmed against current Catalyst documentation during implementation.
