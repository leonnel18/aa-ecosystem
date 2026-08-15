import logging

import monitor

logger = logging.getLogger()


def handler(cron_details, context):
    """
    Catalyst cron entry point. Runs the daily CRM monitor (new-records
    digest, email-activity check, graduate-date consistency check, 6-month
    due list) and emails the results, on the schedule configured in the
    Catalyst console for this function (7:00 AM Asia/Manila).
    """
    try:
        summary = monitor.run()
        logger.info("monitor-job run summary: %s", summary)
        context.close_with_success()
    except Exception:
        logger.exception("monitor-job run failed")
        context.close_with_failure()
