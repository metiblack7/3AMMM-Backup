const mongoose = require('mongoose');

const lyricSectionSchema = new mongoose.Schema({
  s: { type: String, required: true }, // section label e.g. "Chorus"
  t: { type: String, required: true }, // section text
}, { _id: false });

const songSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
  },
  key: {
    type: String,
    default: 'C',
    trim: true,
  },
  tempo: {
    type: String,
    default: 'Medium',
    trim: true,
  },
  singerName: {
    type: String,
    required: [true, 'Singer name is required'],
    trim: true,
  },
  category: {
    type: String,
    default: 'Worship',
    trim: true,
  },
  lyrics: {
    type: [lyricSectionSchema],
    default: [],
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

// Text index for search
songSchema.index({ title: 'text', singerName: 'text', category: 'text' });

module.exports = mongoose.model('Song', songSchema);
