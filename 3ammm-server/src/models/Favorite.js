const mongoose = require('mongoose');

// ── FAVORITE ──────────────────────────────────────────────────
const favoriteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  songId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Song',
    required: true,
  },
}, { timestamps: true });

// One favorite per user per song
favoriteSchema.index({ userId: 1, songId: 1 }, { unique: true });

const Favorite = mongoose.model('Favorite', favoriteSchema);

// ── NOTIFICATION ──────────────────────────────────────────────
const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  type: {
    type: String,
    enum: ['info', 'setlist', 'song'],
    default: 'info',
  },
}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = { Favorite, Notification };
