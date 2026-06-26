const express = require('express');
const { Favorite, Notification } = require('../models/Favorite');
const { protect, adminOnly } = require('../middleware/auth');

const favRouter = express.Router();
const notifRouter = express.Router();

// ── FAVORITES ──────────────────────────────────────────────────

// GET /api/favorites — user's favorite songs (populated)
favRouter.get('/', protect, async (req, res) => {
  try {
    const favs = await Favorite.find({ userId: req.user._id }).populate('songId');
    const songs = favs.map(f => f.songId).filter(Boolean);
    res.json(songs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/favorites/ids — just the song IDs (for checking if song is fav)
favRouter.get('/ids', protect, async (req, res) => {
  try {
    const favs = await Favorite.find({ userId: req.user._id }).select('songId');
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

// ── NOTIFICATIONS ──────────────────────────────────────────────

// GET /api/notifications
notifRouter.get('/', protect, async (req, res) => {
  try {
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
