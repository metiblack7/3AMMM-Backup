const express = require('express');
const Song = require('../models/Song');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/songs — all songs (authenticated)
router.get('/', protect, async (req, res) => {
  try {
    const { search, singer } = req.query;
    const filter = {};
    if (search) filter.$text = { $search: search };
    if (singer) filter.singerName = singer;
    const songs = await Song.find(filter).sort({ title: 1 });
    res.json(songs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/songs/singers — unique singer names
router.get('/singers', protect, async (req, res) => {
  try {
    const singers = await Song.distinct('singerName');
    res.json(singers.sort());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/songs/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ message: 'Song not found.' });
    res.json(song);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/songs — admin only
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const song = await Song.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(song);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/songs/:id — admin only
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const song = await Song.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    if (!song) return res.status(404).json({ message: 'Song not found.' });
    res.json(song);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/songs/:id — admin only
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const song = await Song.findByIdAndDelete(req.params.id);
    if (!song) return res.status(404).json({ message: 'Song not found.' });
    res.json({ message: 'Song deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
