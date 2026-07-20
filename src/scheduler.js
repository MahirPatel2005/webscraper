const cron = require('node-cron');
const config = require('./config');
const logger = require('./logger');
const { runOnce } = require('./scraper');

logger.info('Scheduler starting', { cronSchedule: config.cronSchedule });

// Run once immediately on startup so PM2 restarts also trigger a sync
runOnce().catch((err) => logger.error('Initial run failed', { error: err.message }));

cron.schedule(config.cronSchedule, async () => {
  try {
    await runOnce();
  } catch (err) {
    logger.error('Scheduled run failed', { error: err.message, stack: err.stack });
  }
});

logger.info('Scheduler is running. Service will stay alive via PM2/cron.');
