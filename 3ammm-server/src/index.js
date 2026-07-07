require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes      = require('./routes/auth');
const songRoutes      = require('./routes/songs');
const setlistRoutes   = require('./routes/setlists');
const { favRouter, notifRouter } = require('./routes/favorites');
const userRoutes      = require('./routes/users');
const feedbackRoutes  = require('./routes/feedback');

const app = express();

const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT     = process.env.PORT || 5000;

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ── DB middleware — runs before every request on Vercel ────────
// On serverless every cold start needs a fresh connection check.
// The cached global ensures we reuse existing connections instead
// of opening a new one on every request.
app.use(async (req, res, next) => {
  try {
    await connectDB({ serverless: true });
    next();
  } catch (err) {
    console.error('DB connection failed:', err.message);
    res.status(500).json({ message: 'Database connection failed.' });
  }
});

app.use('/api/auth',          authRoutes);
app.use('/api/songs',         songRoutes);
app.use('/api/setlists',      setlistRoutes);
app.use('/api/favorites',     favRouter);
app.use('/api/notifications', notifRouter);
app.use('/api/users',         userRoutes);
app.use('/api/feedback',      feedbackRoutes);

app.get('/api/app/version', (_req, res) => {
  res.json({
    version: '1.0.0',
    buildNumber: 1,
    releaseDate: '2024-01-01',
    minSupportedVersion: '1.0.0',
  });
});

app.get('/health', (_req, res) => res.json({
  status: 'ok',
  app: '3AMMM API',
  environment: NODE_ENV,
  database: require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected',
  timestamp: new Date().toISOString(),
}));

app.use((_req, res) => res.status(404).json({ message: 'Route not found.' }));

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Server error.',
    ...(NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ── Local dev only ─────────────────────────────────────────────
if (require.main === module) {
  connectDB({ serverless: false }).then(() => {
    app.listen(PORT, () => {
      console.log(`
🚀 3AMMM API Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Environment: ${NODE_ENV}
Port: ${PORT}
Health Check: http://localhost:${PORT}/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
    });
  }).catch((err) => {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  });
}

module.exports = app;