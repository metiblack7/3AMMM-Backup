const mongoose = require('mongoose');

const rawMongoUri = process.env.MONGODB_URI || process.env.MONGO_URL || process.env.MONGO_PUBLIC_URL;
const MONGO_SOURCE = process.env.MONGODB_URI ? 'MONGODB_URI' : process.env.MONGO_URL ? 'MONGO_URL' : process.env.MONGO_PUBLIC_URL ? 'MONGO_PUBLIC_URL' : 'none';

const formatUriLog = (uri) => {
  if (!uri) return 'none';
  return uri.replace(/mongodb(\+srv)?:\/\/.+@/, 'mongodb$1://<auth>@');
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

const MONGO_OPTIONS = {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 5,
  minPoolSize: 0,
  bufferCommands: false,
};

const cached = global.__mongooseCache || (global.__mongooseCache = { conn: null, promise: null });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isConnected() {
  return mongoose.connection.readyState === 1;
}

async function connectServerless() {
  if (isConnected()) {
    return mongoose.connection;
  }

  if (cached.conn && isConnected()) {
    return cached.conn;
  }

  if (!cached.promise) {
    console.log(`🔧 MongoDB connection source: ${MONGO_SOURCE}`, formatUriLog(MONGO_URI));
    cached.promise = mongoose.connect(MONGO_URI, MONGO_OPTIONS)
      .then((conn) => {
        console.log(`✅ MongoDB connected: ${conn.connection.host}`);
        cached.conn = conn;
        return conn;
      })
      .catch((err) => {
        cached.promise = null;
        cached.conn = null;
        throw err;
      });
  }

  return cached.promise;
}

async function connectDB(options = {}) {
  const { serverless = false } = options;

  if (!MONGO_URI) {
    throw new Error('No MongoDB connection string provided. Set MONGODB_URI on Vercel.');
  }

  if (serverless) {
    return connectServerless();
  }

  const retries = 6;
  const delayMs = 10000;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      if (isConnected()) {
        return mongoose.connection;
      }

      console.log(`🔧 MongoDB connection source: ${MONGO_SOURCE}`, formatUriLog(MONGO_URI));
      const conn = await mongoose.connect(MONGO_URI, MONGO_OPTIONS);
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
