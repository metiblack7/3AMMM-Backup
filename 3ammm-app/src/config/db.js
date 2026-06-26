const mongoose = require('mongoose');

const rawMongoUri = process.env.MONGODB_URI || process.env.MONGO_URL || process.env.MONGO_PUBLIC_URL;
const MONGO_SOURCE = process.env.MONGODB_URI ? 'MONGODB_URI' : process.env.MONGO_URL ? 'MONGO_URL' : process.env.MONGO_PUBLIC_URL ? 'MONGO_PUBLIC_URL' : 'none';
const formatUriLog = (uri) => {
  if (!uri) return 'none';
  return uri.replace(/mongodb:\/\/.+@/, 'mongodb://<auth>@');
};

const buildMongoUri = (uri) => {
  if (!uri) return uri;
  const normalized = uri.trim();
  if (normalized.startsWith('mongodb+srv://')) {
    return normalized;
  }
  if (normalized.includes('authSource=') || normalized.includes('directConnection=') || normalized.includes('retryWrites=')) {
    return normalized;
  }
  const query = 'authSource=admin&retryWrites=false';
  return normalized.includes('?') ? `${normalized}&${query}` : `${normalized}?${query}`;
};

const MONGO_URI = buildMongoUri(rawMongoUri);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function connectDB(retries = 6, delayMs = 10000) {
  if (!MONGO_URI) {
    throw new Error('No MongoDB connection string provided. Set MONGO_URL, MONGODB_URI, or MONGO_PUBLIC_URL.');
  }

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      console.log(`🔧 MongoDB connection source: ${MONGO_SOURCE}`, formatUriLog(MONGO_URI));
      const conn = await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 20000,
        connectTimeoutMS: 20000,
        socketTimeoutMS: 60000,
      });
      console.log(`✅ MongoDB connected: ${conn.connection.host}`);
      return conn;
    } catch (err) {
      console.error(`❌ MongoDB connection error (attempt ${attempt}/${retries}):`, err.message);
      if (attempt === retries) {
        console.error(err);
        process.exit(1);
      }
      console.log(`⏳ Retrying MongoDB connection in ${delayMs / 1000}s...`);
      await delay(delayMs);
    }
  }
}

module.exports = connectDB;
