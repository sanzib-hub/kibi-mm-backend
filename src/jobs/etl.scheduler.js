const cron = require('node-cron');
const config = require('../config');
const { runEtl } = require('./sheetsEtl.service');
const { runExcelEtl } = require('./excelCrmEtl.service');

function startEtlScheduler() {
  cron.schedule('0 2 * * *', async () => {
    console.log('[ETL] Scheduled run triggered...');
    try {
      await runEtl();
    } catch (err) {
      console.error('[ETL] Sheets sync failed:', err.message);
    }
    if (config.excelCrmPath) {
      try {
        await runExcelEtl();
      } catch (err) {
        console.error('[ETL] Excel CRM sync failed:', err.message);
      }
    }
  });

  console.log('[ETL] Scheduler registered (daily at 02:00)');
}

module.exports = { startEtlScheduler };
