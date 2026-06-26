require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const songRoutes = require('./routes/songs');
const setlistRoutes = require('./routes/setlists');
const { favRouter, notifRouter } = require('./routes/favorites');
const userRoutes = require('./routes/users');

const app = express();

// ── MIDDLEWARE ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger in dev
if (process.env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ── ROUTES ────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/setlists', setlistRoutes);
app.use('/api/favorites', favRouter);
app.use('/api/notifications', notifRouter);
app.use('/api/users', userRoutes);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', app: '3AMMM API' }));

// 404
app.use((_req, res) => res.status(404).json({ message: 'Route not found.' }));

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Server error.' });
});

// ── START ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 3AMMM API running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
  });
});
