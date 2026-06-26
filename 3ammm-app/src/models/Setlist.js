const mongoose = require('mongoose');

const setlistSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
  },
  date: {
    type: String,
    required: [true, 'Date is required'],
    trim: true,
  },
  songIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Song',
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

module.exports = mongoose.model('Setlist', setlistSchema);
