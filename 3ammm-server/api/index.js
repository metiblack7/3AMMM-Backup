require('dotenv').config();

const mongoose = require('mongoose');
const app = require('../src/index');
const connectDB = require('../src/config/db');

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

function runApp(req, res) {
  return new Promise((resolve, reject) => {
    const finish = () => {
      res.removeListener('finish', finish);
      res.removeListener('close', finish);
      resolve();
    };

    res.once('finish', finish);
    res.once('close', finish);

    try {
      app(req, res);
    } catch (err) {
      res.removeListener('finish', finish);
      res.removeListener('close', finish);
      reject(err);
    }
  });
}

function sendHealth(res) {
  return res.status(200).json({
    status: 'ok',
    app: '3AMMM API',
    environment: process.env.NODE_ENV || 'production',
    database: isDbConnected() ? 'connected' : 'disconnected',
    mongoConfigured: Boolean(
      process.env.MONGODB_URI || process.env.MONGO_URL || process.env.MONGO_PUBLIC_URL,
    ),
    timestamp: new Date().toISOString(),
  });
}

module.exports = async (req, res) => {
  const path = req.url?.split('?')[0] || '';
  const startedAt = Date.now();

  console.info(`[request] ${req.method} ${path} started`);

  if (path === '/health' && req.method !== 'OPTIONS') {
    try {
      await connectDB({ serverless: true });
      await mongoose.connection.db.admin().ping({ maxTimeMS: 3000 });
      console.info(`[request] ${req.method} ${path} complete ms=${Date.now() - startedAt}`);
      return sendHealth(res);
    } catch (err) {
      console.error(
        `[request] ${req.method} ${path} failed stage=database name=${err.name || 'Error'} code=${err.code || 'unknown'} ms=${Date.now() - startedAt}`,
      );
      return res.status(503).json({
        status: 'error',
        database: isDbConnected() ? 'connected' : 'disconnected',
        message: 'Database is unavailable.',
      });
    }
  }

  if (req.method !== 'OPTIONS') {
    try {
      await connectDB({ serverless: true });
    } catch (err) {
      console.error(
        `[request] ${req.method} ${path} failed stage=database name=${err.name || 'Error'} code=${err.code || 'unknown'} ms=${Date.now() - startedAt}`,
      );
      return res.status(503).json({
        message: 'Database is unavailable.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }
  }

  try {
    await runApp(req, res);
    console.info(`[request] ${req.method} ${path} complete ms=${Date.now() - startedAt}`);
    return;
  } catch (err) {
    console.error(
      `[request] ${req.method} ${path} failed stage=handler name=${err.name || 'Error'} code=${err.code || 'unknown'} ms=${Date.now() - startedAt}`,
    );
    if (!res.headersSent) {
      return res.status(500).json({
        message: 'Request could not be completed.',
        code: 'REQUEST_FAILED',
      });
    }
    throw err;
  }
};
