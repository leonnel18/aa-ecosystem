import logging

import reminder

logger = logging.getLogger()


def handler(cron_details, context):
    """
    Catalyst cron entry point. Runs the daily reminder engine (C1-C6
    country-team milestone reminders, P1/P2 participant 6-month evaluation
    reminders) on the schedule configured in the Catalyst console for this
    function (set manually, same as pipeline-job and monitor-job).
    """
    try:
        summary = reminder.run()
        logger.info("reminder-job run summary: %s", summary)
        context.close_with_success()
    except Exception:
        logger.exception("reminder-job run failed")
        context.close_with_failure()
