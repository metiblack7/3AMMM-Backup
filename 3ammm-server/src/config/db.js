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

const formatUriLog = (uri) => {
  if (!uri) return 'none';
  return uri.replace(/mongodb(\+srv)?:\/\/.+@/, 'mongodb$1://<auth>@');
};

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

// bufferCommands: true allows Mongoose to queue operations while
// the connection is being established — critical for serverless
// where the DB middleware awaits the connection but route handlers
// may still fire before it fully resolves on the first cold start.
const MONGO_OPTIONS = {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 5,
  minPoolSize: 0,
  bufferCommands: true,
};

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
  // Already connected — reuse
  if (isConnected() && cached.conn) return cached.conn;

  // Connection in progress — wait for it
  if (cached.promise) return cached.promise;

  if (!MONGO_URI) {
    throw new Error('No MongoDB connection string provided. Set MONGODB_URI on Vercel.');
  }

  console.log(`🔧 MongoDB source: ${MONGO_SOURCE}`, formatUriLog(MONGO_URI));

  cached.promise = mongoose
    .connect(MONGO_URI, MONGO_OPTIONS)
    .then((conn) => {
      console.log(`✅ MongoDB connected: ${conn.connection.host}`);
      cached.conn = conn;
      return conn;
    })
    .catch((err) => {
      // Reset so the next request can retry
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

      console.log(`🔧 MongoDB source: ${MONGO_SOURCE}`, formatUriLog(MONGO_URI));
      const conn = await mongoose.connect(MONGO_URI, MONGO_OPTIONS);
      console.log(`✅ MongoDB connected: ${conn.connection.host}`);
      return conn;
    } catch (err) {
      console.error(
        `❌ MongoDB connection error (attempt ${attempt}/${retries}):`,
        err.message,
      );
      if (attempt === retries) {
        console.error(err);
        process.exit(1);
      }
      console.log(`⏳ Retrying in ${delayMs / 1000}s...`);
      await delay(delayMs);
    }
  }
}

module.exports = connectDB;