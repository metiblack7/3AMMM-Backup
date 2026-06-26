const express = require('express');
const Song = require('../models/Song');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

/**
 * Perform precise character-by-character search
 * Supports exact substring match, word-by-word, and fuzzy matching
 */
function performSearch(songs, query) {
  if (!query) return songs;
  
  const q = query.toLowerCase();
  return songs.filter(song => {
    const title = song.title.toLowerCase();
    const lyrics = song.lyrics.toLowerCase();
    
    // 1. Exact substring match (most precise)
    if (title.includes(q) || lyrics.includes(q)) return true;
    
    // 2. Word-by-word match (word starts with query)
    const titleWords = title.split(/\s+/);
    const lyricsWords = lyrics.split(/\s+/);
    if (titleWords.some(w => w.startsWith(q))) return true;
    if (lyricsWords.some(w => w.startsWith(q))) return true;
    
    // 3. Character-by-character fuzzy matching
    let titleIdx = 0;
    for (let i = 0; i < q.length; i++) {
      titleIdx = title.indexOf(q[i], titleIdx);
      if (titleIdx === -1) return false;
      titleIdx++;
    }
    return true;
  });
}

// GET /api/songs — all songs (authenticated)
router.get('/', protect, async (req, res) => {
  try {
    const { search, singer } = req.query;
    let songs = await Song.find().sort({ title: 1 });
    
    // Apply singer filter first (database level)
    if (singer) {
      songs = songs.filter(s => s.singerName === singer);
    }
    
    // Apply search filter (client-side for more control)
    if (search) {
      songs = performSearch(songs, search);
    }
    
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
