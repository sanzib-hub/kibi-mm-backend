const app = require('./app');
const config = require('./config');
const { startEtlScheduler } = require('./jobs/etl.scheduler');

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`\nKIBI Backend running on http://localhost:${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Health: http://localhost:${PORT}/health\n`);

  // Start nightly ETL scheduler
  startEtlScheduler();
});
