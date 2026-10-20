const express = require('express');
const mongoose = require("mongoose");
const Setlist = require('../models/Setlist');
const Song = require('../models/Song');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/setlists — all setlists with populated songs
router.get('/', async (req, res) => {
  try {
    const setlists = await Setlist.find()
      .populate('songIds')
      .sort({ createdAt: -1 });
    res.json(setlists);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/setlists/:id
router.get('/:id', async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "Invalid setlist id." });
  }
  try {
    const setlist = await Setlist.findById(req.params.id).populate('songIds');
    if (!setlist) return res.status(404).json({ message: 'Setlist not found.' });
    res.json(setlist);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/setlists — admin only
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    if (!Array.isArray(req.body.songIds) || req.body.songIds.length === 0) {
      return res.status(400).json({
        message: "A setlist must contain at least one song.",
      });
    }
    const setlist = await Setlist.create({ ...req.body, createdBy: req.user._id });
    const populated = await setlist.populate('songIds');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/setlists/:id — admin only
router.put('/:id', protect, adminOnly, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "Invalid setlist id." });
  }
  try {
    if (!Array.isArray(req.body.songIds) || req.body.songIds.length === 0) {
      return res.status(400).json({
        message: "A setlist must contain at least one song.",
      });
    }
    const setlist = await Setlist.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    }).populate('songIds');
    if (!setlist) return res.status(404).json({ message: 'Setlist not found.' });
    res.json(setlist);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/setlists/:id — admin only
router.delete('/:id', protect, adminOnly, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "Invalid setlist id." });
  }
  try {
    const setlist = await Setlist.findByIdAndDelete(req.params.id);
    if (!setlist) return res.status(404).json({ message: 'Setlist not found.' });
    res.json({ message: 'Setlist deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
