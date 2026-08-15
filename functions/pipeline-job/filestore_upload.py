"""
filestore_upload.py — Upload dashboard_data.json to Catalyst File Store

Replaces the old shutil.copy2() sync into portal/data/ (Wrangler/Cloudflare
era). The pipeline Job and the Slate client do not share a filesystem on
Catalyst, so the generated dashboard_data.json is pushed to a File Store
folder instead. The crm-proxy Advanced I/O Function serves it to the portal
via a GET /dashboard-data route (File Store has no public URL of its own).

Folder: "portaldata" (id 56790000000031008), created manually in the
Catalyst console, Cloud Scale > File Store.

File Store's SDK has no "find file by name" or "overwrite by name" — every
upload_file() call creates a brand new file with a new id, and reads
(get_file_details / download_file) require that id. To make the current
file discoverable by the crm-proxy Function (a separate deployment with no
shared filesystem or memory), the current file's id is tracked in a Data
Store table: "AA_Ecosystem_PipelineState" (id 56790000000031021), one row
per state key. This upload always deletes the previously-tracked file (if
any) after a successful new upload, so the folder holds at most one
dashboard_data.json at a time.
"""

import zcatalyst_sdk

PORTALDATA_FOLDER_ID = 56790000000031008
DASHBOARD_FILE_NAME = "dashboard_data.json"
PIPELINE_STATE_TABLE_ID = 56790000000031021
DASHBOARD_STATE_KEY = "dashboard_data"


def _find_state_row(table):
    """Return the existing state row for DASHBOARD_STATE_KEY, or None."""
    for row in table.get_iterable_rows():
        if row.get("state_key") == DASHBOARD_STATE_KEY:
            return row
    return None


def upload_dashboard_data(local_path: str):
    """
    Upload the given local dashboard_data.json to the portaldata File Store
    folder, then update the AA_Ecosystem_PipelineState table so crm-proxy
    can find the new file. Deletes the previously-tracked file afterward
    so old dashboard_data.json files don't accumulate in the folder.
    """
    app = zcatalyst_sdk.initialize()
    folder = app.filestore().folder(PORTALDATA_FOLDER_ID)
    table = app.datastore().table(PIPELINE_STATE_TABLE_ID)

    previous_row = _find_state_row(table)
    previous_file_id = previous_row.get("file_id") if previous_row else None

    with open(local_path, "rb") as f:
        new_file = folder.upload_file(DASHBOARD_FILE_NAME, f)
    new_file_id = new_file["id"]

    if previous_row:
        table.update_row({
            "ROWID": previous_row["ROWID"],
            "state_key": DASHBOARD_STATE_KEY,
            "file_id": new_file_id,
        })
    else:
        table.insert_row({
            "state_key": DASHBOARD_STATE_KEY,
            "file_id": new_file_id,
        })

    # Best-effort cleanup of the old file. If this fails, the new upload
    # and state row are already correct — an orphaned old file is a minor
    # storage cost, not a correctness problem, so we log and move on
    # rather than failing the whole pipeline run over it.
    if previous_file_id:
        try:
            folder.delete_file(previous_file_id)
        except Exception as e:
            print(f"  [WARN] Could not delete previous File Store file {previous_file_id}: {e}")
