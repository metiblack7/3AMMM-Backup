const express = require('express');
const Song = require('../models/Song');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

function performSearch(songs, query) {
  if (!query) return songs;

  const q = query.toLowerCase();
  return songs.filter((song) => {
    const title = song.title.toLowerCase();
    const lyrics = song.lyrics
      .map((line) => line.s || line.t || '')
      .join(' ')
      .toLowerCase();

    if (title.includes(q) || lyrics.includes(q)) return true;

    const titleWords = title.split(/\s+/);
    const lyricsWords = lyrics.split(/\s+/);
    if (titleWords.some((w) => w.startsWith(q))) return true;
    if (lyricsWords.some((w) => w.startsWith(q))) return true;

    let titleIdx = 0;
    for (let i = 0; i < q.length; i++) {
      titleIdx = title.indexOf(q[i], titleIdx);
      if (titleIdx === -1) return false;
      titleIdx++;
    }
    return true;
  });
}

router.get('/', async (req, res) => {
  try {
    const { search, singer } = req.query;
    let songs = await Song.find().sort({ title: 1 });

    if (singer) {
      songs = songs.filter((s) => s.singerName === singer);
    }

    if (search) {
      songs = performSearch(songs, search);
    }

    res.json(songs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/singers', async (req, res) => {
  try {
    const singers = await Song.distinct('singerName');
    res.json(singers.sort());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ message: 'Song not found.' });
    res.json(song);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const song = await Song.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(song);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const song = await Song.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!song) return res.status(404).json({ message: 'Song not found.' });
    res.json(song);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

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
