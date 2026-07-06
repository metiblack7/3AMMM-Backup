require('dotenv').config();

const app = require('../src/index');
const connectDB = require('../src/config/db');

let dbReady = false;

module.exports = async (req, res) => {
  try {
    if (!dbReady) {
      await connectDB({ serverless: true });
      dbReady = true;
    }
  } catch (err) {
    console.error('Database connection failed:', err);
    return res.status(500).json({ message: 'Database connection failed.' });
  }

  return app(req, res);
};
