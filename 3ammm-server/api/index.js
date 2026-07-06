require('dotenv').config();

const serverless = require('serverless-http');
const mongoose = require('mongoose');
const app = require('../src/index');
const connectDB = require('../src/config/db');

let handler;

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

function sendHealth(res) {
  return res.status(200).json({
    status: 'ok',
    app: '3AMMM API',
    environment: process.env.NODE_ENV || 'production',
    database: isDbConnected() ? 'connected' : 'disconnected',
    mongoConfigured: Boolean(process.env.MONGODB_URI || process.env.MONGO_URL),
    timestamp: new Date().toISOString(),
  });
}

module.exports = async (req, res) => {
  const path = req.url?.split('?')[0] || '';

  if (path === '/health') {
    if (!isDbConnected()) {
      try {
        await connectDB({ serverless: true });
      } catch (err) {
        console.error('Health check DB connect failed:', err.message);
      }
    }
    return sendHealth(res);
  }

  try {
    await connectDB({ serverless: true });
  } catch (err) {
    console.error('Database connection failed:', err.message);
    return res.status(503).json({
      message: 'Database connection failed. Verify MONGODB_URI is set on Vercel and Atlas allows 0.0.0.0/0.',
    });
  }

  if (!handler) {
    handler = serverless(app);
  }

  return handler(req, res);
};
