const express = require('express');
const { Favorite, Notification } = require('../models/Favorite');
const { protect, adminOnly } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const favRouter = express.Router();
const notifRouter = express.Router();

// ── FAVORITES ──────────────────────────────────────────────────

// GET /api/favorites — user's favorite songs (populated)
favRouter.get('/', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Not authenticated — return empty favorites for guest
      return res.json([]);
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.json([]);

    const favs = await Favorite.find({ userId: user._id }).populate('songId');
    const songs = favs.map(f => f.songId).filter(Boolean);
    res.json(songs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/favorites/ids — just the song IDs (for checking if song is fav)
favRouter.get('/ids', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.json([]);
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.json([]);

    const favs = await Favorite.find({ userId: user._id }).select('songId');
    res.json(favs.map(f => f.songId.toString()));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/favorites/:songId — toggle favorite
favRouter.post('/:songId', protect, async (req, res) => {
  try {
    const { songId } = req.params;
    const existing = await Favorite.findOne({ userId: req.user._id, songId });
    if (existing) {
      await existing.deleteOne();
      return res.json({ favorited: false });
    }
    await Favorite.create({ userId: req.user._id, songId });
    res.json({ favorited: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/favorites/merge — batch-merge an array of songIds into
// the authenticated user's favorites. Accepts { songIds: string[] }.
favRouter.post('/merge', protect, async (req, res) => {
  try {
    const { songIds } = req.body || {};
    if (!Array.isArray(songIds)) {
      return res.status(400).json({ message: 'songIds must be an array' });
    }

    const toProcess = songIds.map((id) => id.toString());

    // For each provided songId, create Favorite if it doesn't exist
    for (const songId of toProcess) {
      const exists = await Favorite.findOne({ userId: req.user._id, songId });
      if (!exists) {
        try {
          await Favorite.create({ userId: req.user._id, songId });
        } catch (err) {
          // ignore individual create errors (e.g., invalid songId)
          console.warn('Failed to create favorite for', songId, err.message || err);
        }
      }
    }

    const favs = await Favorite.find({ userId: req.user._id }).select('songId');
    res.json(favs.map((f) => f.songId.toString()));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── NOTIFICATIONS ──────────────────────────────────────────────

// GET /api/notifications
notifRouter.get('/', async (req, res) => {
  try {
    // Notifications are public-read — return latest 20
    const notifs = await Notification.find().sort({ createdAt: -1 }).limit(20);
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/notifications — admin only
notifRouter.post('/', protect, adminOnly, async (req, res) => {
  try {
    const notif = await Notification.create(req.body);
    res.status(201).json(notif);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = { favRouter, notifRouter };
