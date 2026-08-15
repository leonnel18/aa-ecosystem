import logging

import orchestrator

logger = logging.getLogger()


def handler(cron_details, context):
    """
    Catalyst cron entry point. Runs the full CRM pipeline (extract ->
    transform -> write -> upload to File Store) on the schedule configured
    in the Catalyst console for this function.
    """
    try:
        orchestrator.run_pipeline()
        context.close_with_success()
    except Exception:
        logger.exception("Pipeline run failed")
        context.close_with_failure()
