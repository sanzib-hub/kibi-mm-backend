const app = require('./app');
const config = require('./config');
const { startEtlScheduler } = require('./jobs/etl.scheduler');

const PORT = process.env.PORT || config.port || 3001;

app.listen(PORT, () => {
  console.log("DATABASE_URL:", process.env.DATABASE_URL);
  console.log(`KIBI Backend running on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Health endpoint enabled at /health`);

  // Only run scheduler in non-serverless OR explicitly enabled
  if (process.env.ENABLE_SCHEDULER === "true") {
    startEtlScheduler();
    console.log("ETL Scheduler started");
  }
});
