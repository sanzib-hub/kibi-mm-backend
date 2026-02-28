require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const sanitize = require('./middleware/sanitize');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes/index');

const app = express();

// ─── Global Middleware ────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitize);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  let db = 'unknown';
  try {
    const prisma = require('./lib/prismaClient');
    await prisma.$connect();
    db = 'ok';
  } catch (e) {
    db = 'error';
  }
  const ok = db === 'ok';
  res.status(ok ? 200 : 503).json({
    ok,
    service: 'kibi-backend',
    db,
    timestamp: new Date().toISOString(),
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/', routes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
