require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const songRoutes = require('./routes/songs');
const setlistRoutes = require('./routes/setlists');
const { favRouter, notifRouter } = require('./routes/favorites');
const userRoutes = require('./routes/users');
const feedbackRoutes = require('./routes/feedback');

const app = express();

const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 5000;

const getCorsOptions = () => {
  if (NODE_ENV === 'production') {
    const allowedOrigins = [
      process.env.CORS_ORIGIN || '*',
      'https://your-app.expo.app',
    ].filter(Boolean);

    return {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          callback(null, true);
        } else {
          callback(new Error('CORS not allowed'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    };
  }

  return { origin: '*' };
};

app.use(cors(getCorsOptions()));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

app.use('/api/auth', authRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/setlists', setlistRoutes);
app.use('/api/favorites', favRouter);
app.use('/api/notifications', notifRouter);
app.use('/api/users', userRoutes);
app.use('/api/feedback', feedbackRoutes);

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

if (require.main === module) {
  connectDB().then(() => {
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
