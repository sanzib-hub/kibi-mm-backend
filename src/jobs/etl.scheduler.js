const cron = require('node-cron');
const { runEtl } = require('./sheetsEtl.service');

function startEtlScheduler() {
  // Run at 2:00 AM every day
  cron.schedule('0 2 * * *', async () => {
    console.log('[ETL] Scheduled run triggered...');
    try {
      await runEtl();
    } catch (err) {
      console.error('[ETL] Scheduled run failed:', err.message);
    }
  });

  console.log('[ETL] Scheduler registered (daily at 02:00)');
}

module.exports = { startEtlScheduler };
