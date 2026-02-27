const app = require('./app');
const config = require('./config');
const { startEtlScheduler } = require('./jobs/etl.scheduler');

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`\nKIBI Backend running on http://localhost:${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  if (!config.googleSheetsId) console.log('  (Optional) GOOGLE_SHEETS_ID not set — Sheets ETL disabled');
  if (!config.excelCrmPath) console.log('  (Optional) EXCEL_CRM_PATH not set — Excel ETL manual/scheduled only');
  console.log('');

  startEtlScheduler();
});
