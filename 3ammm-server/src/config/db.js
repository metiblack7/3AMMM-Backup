const mongoose = require('mongoose');

const rawMongoUri =
  process.env.MONGODB_URI ||
  process.env.MONGO_URL ||
  process.env.MONGO_PUBLIC_URL;

const MONGO_SOURCE = process.env.MONGODB_URI
  ? 'MONGODB_URI'
  : process.env.MONGO_URL
    ? 'MONGO_URL'
    : process.env.MONGO_PUBLIC_URL
      ? 'MONGO_PUBLIC_URL'
      : 'none';

const buildMongoUri = (uri) => {
  if (!uri) return uri;
  const normalized = uri.trim();
  if (normalized.startsWith('mongodb+srv://')) return normalized;
  if (
    normalized.includes('authSource=') ||
    normalized.includes('directConnection=') ||
    normalized.includes('retryWrites=')
  ) return normalized;
  const query = 'authSource=admin&retryWrites=false';
  return normalized.includes('?')
    ? `${normalized}&${query}`
    : `${normalized}?${query}`;
};

const MONGO_URI = buildMongoUri(rawMongoUri);

const MONGO_OPTIONS = {
  serverSelectionTimeoutMS: 4000,
  connectTimeoutMS: 4000,
  socketTimeoutMS: 10000,
  maxPoolSize: 5,
  minPoolSize: 0,
};

mongoose.set('bufferCommands', false);

// Global cache — survives across Vercel serverless invocations
// within the same container, preventing a new connection on every
// request.
const cached = global.__mongooseCache ||
  (global.__mongooseCache = { conn: null, promise: null });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isConnected() {
  return mongoose.connection.readyState === 1;
}

async function connectServerless() {
  if (isConnected()) {
    cached.conn = mongoose.connection;
    return cached.conn;
  }

  if (cached.promise) {
    try {
      const conn = await cached.promise;
      if (isConnected()) return conn;
    } catch {
      cached.promise = null;
      cached.conn = null;
    }
  }

  cached.promise = null;
  cached.conn = null;

  if (!MONGO_URI) {
    throw new Error('No MongoDB connection string provided. Set MONGODB_URI on Vercel.');
  }

  console.info(`[db] connecting; source=${MONGO_SOURCE}`);

  cached.promise = mongoose
    .connect(MONGO_URI, MONGO_OPTIONS)
    .then((conn) => {
      cached.conn = conn;
      console.info('[db] connected');
      return conn;
    })
    .catch((err) => {
      cached.promise = null;
      cached.conn = null;
      throw err;
    });

  return cached.promise;
}

async function connectDB(options = {}) {
  const { serverless = false } = options;

  if (!MONGO_URI) {
    throw new Error('No MongoDB connection string provided. Set MONGODB_URI on Vercel.');
  }

  if (serverless) return connectServerless();

  // ── Local / non-serverless: retry loop ────────────────────────
  const retries = 6;
  const delayMs = 10000;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      if (isConnected()) return mongoose.connection;

      console.info(`[db] connecting; source=${MONGO_SOURCE}`);
      const conn = await mongoose.connect(MONGO_URI, MONGO_OPTIONS);
      console.info('[db] connected');
      return conn;
    } catch (err) {
      console.error(
        `[db] connection failed attempt=${attempt}/${retries} name=${err.name || 'Error'} code=${err.code || 'unknown'}`,
      );
      if (attempt === retries) {
        process.exit(1);
      }
      console.log(`⏳ Retrying in ${delayMs / 1000}s...`);
      await delay(delayMs);
    }
  }
}

module.exports = connectDB;