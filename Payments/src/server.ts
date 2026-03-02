import dotenv from "dotenv";
import app from "./app";
import redisClient from "./utils/redis/redis";

dotenv.config();

const PORT = Number(process.env.PORT) || 4003;

/**
 * 🔹 Validate env vars (WARN ONLY – never exit)
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
 * 🔹 Start HTTP server FIRST (mandatory for Cloud Run)
 */
console.log('🚀 Starting KIBI Payments Service...');
console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔌 Port: ${PORT}`);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ KIBI Payments Service running on port ${PORT}`);
  console.log(`Health: /health`);
  console.log(`Payments API: /api/payments`);
  console.log(`Swagger: /api-docs`);
});

/**
 * 🔹 Initialize Redis ASYNC (best-effort, non-blocking)
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
 * 🔹 Server error handling (NO process.exit)
 */
server.on('error', (error: any) => {
  console.error('❌ Server error:', error);
});

/**
 * 🔹 Graceful shutdown
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
  console.error('⚠️ Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('⚠️ Uncaught Exception:', error);
});
