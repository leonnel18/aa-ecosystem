"""
orchestrator.py — Full pipeline runner (Catalyst cron function copy)

Runs: crm_extract → transform → data_writer in sequence.
Logs each step with timestamps via print() — Catalyst captures function
stdout/stderr in its own function logs, so there is no progress.md here
(that file only exists in the original repo copy under tools/).

Usage:
  python orchestrator.py                    # full run, all portals
  python orchestrator.py --portal PH        # single portal (skips extract, reuses .tmp/)
  python orchestrator.py --skip-extract     # reuse existing .tmp/ raw files
"""

import os
import sys
import json
import argparse
from datetime import datetime, timezone

# Add this directory to path so imports work regardless of invocation cwd
sys.path.insert(0, os.path.dirname(__file__))
import crm_extract
import transform
import data_writer


def log(msg: str):
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    print(f"[{ts}] {msg}")


def run_pipeline(portal: str = None, skip_extract: bool = False):
    print("=" * 60)
    print("  aa-ecosystem - Pipeline Run")
    print(f"  Portal: {portal or 'ALL'}  |  Skip extract: {skip_extract}")
    print("=" * 60)

    start = datetime.now(timezone.utc)
    log(f"Pipeline started. portal={portal or 'ALL'} skip_extract={skip_extract}")

    # -- Step 1: Extract --
    if not skip_extract:
        print("\n-- Step 1: Extract --")
        modules = None  # always extract all modules (country filter happens in transform)
        try:
            summary = crm_extract.extract_all(modules)
            for mod, count in summary.items():
                log(f"  Extracted {mod}: {count} records")
        except Exception as e:
            log(f"  [FAIL] Extract failed: {e}")
            raise
    else:
        print("\n-- Step 1: Extract (skipped - using existing .tmp/ files) --")

    # -- Step 2: Transform --
    print("\n-- Step 2: Transform --")
    portals = [portal] if portal else None
    try:
        results = transform.transform(portals)
        for p, payload in results.items():
            r1 = payload["report_1_overview"]
            log(f"  Transformed {p}: applicants={r1['total_applicants']} "
                f"graduates={r1['total_graduates']}")
    except Exception as e:
        log(f"  [FAIL] Transform failed: {e}")
        raise

    # ── Step 3: Write ────────────────────────────────────────────
    if portal:
        print("\n-- Step 3: Write (skipped for single-portal debug run) --")
        print("  Run without --portal to write dashboard_data.json")
    else:
        print("\n-- Step 3: Write --")
        try:
            out = data_writer.write_dashboard()
            size_kb = os.path.getsize(out) / 1024
            log(f"  dashboard_data.json written ({size_kb:.1f} KB)")
        except Exception as e:
            log(f"  [FAIL] Data write failed: {e}")
            raise

        # Upload to Catalyst File Store (portaldata folder) so the portal
        # can be served the latest data. Local filesystem is not shared
        # between this Job and the Slate client, so a local copy (the old
        # Wrangler-era shutil.copy2 into portal/data/) is not possible here.
        try:
            import filestore_upload
            filestore_upload.upload_dashboard_data(out)
            log("  dashboard_data.json uploaded to File Store (portaldata)")
        except Exception as e:
            log(f"  [FAIL] File Store upload failed: {e}")
            raise

    elapsed = (datetime.now(timezone.utc) - start).seconds
    log(f"Pipeline complete in {elapsed}s")
    print(f"\n{'=' * 60}")
    print(f"  [DONE] Pipeline complete in {elapsed}s")
    if not portal:
        print(f"  data/dashboard_data.json ready for portal")
    print(f"{'=' * 60}")


def main():
    parser = argparse.ArgumentParser(description="Run the aa-ecosystem pipeline")
    parser.add_argument("--portal", help="Single portal: PK|PH|KR|ID|backbone")
    parser.add_argument("--skip-extract", action="store_true",
                        help="Reuse existing .tmp/ raw files (skip CRM fetch)")
    args = parser.parse_args()
    run_pipeline(portal=args.portal, skip_extract=args.skip_extract)


if __name__ == "__main__":
    main()
