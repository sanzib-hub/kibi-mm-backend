import dotenv from "dotenv";
import app from "./app.js";
import redisClient from "./utils/redis/redis.js";

dotenv.config();

const PORT = Number(process.env.PORT) || 4000;

/**
 * 🔹 Validate env vars (DO NOT EXIT)
 */
const requiredEnvVars = [
  'JWT_SECRET',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'REDIS_HOST',
  'REDIS_PORT'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`⚠️ Missing env var: ${envVar}`);
  }
}

/**
 * 🔹 Start HTTP server FIRST
 */
console.log('🚀 Starting KIBI Affiliate OnBoarding Service...');
console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔌 Port: ${PORT}`);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`Health: /health`);
});

/**
 * 🔹 Initialize Redis ASYNC (NON-BLOCKING)
 */
(async () => {
  try {
    console.log('⏳ Connecting to Redis...');
    await redisClient.connect();
    console.log('✅ Redis connected');
  } catch (err) {
    console.error('⚠️ Redis unavailable, continuing without cache');
    console.error(err);
  }
})();

/**
 * 🔹 Handle server errors
 */
server.on('error', (error: any) => {
  console.error('❌ Server error:', error);
});

/**
 * 🔹 Graceful shutdown (NO exit(1))
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  server.close(() => console.log('HTTP server closed'));
});

process.on('SIGINT', () => {
  console.log('SIGINT received');
  server.close(() => console.log('HTTP server closed'));
});

/**
 * 🔹 Never crash Cloud Run
 */
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('⚠️ Uncaught Exception:', error);
});
