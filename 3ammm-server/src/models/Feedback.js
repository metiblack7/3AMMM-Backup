const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  message: {
    type: String,
    required: [true, 'Feedback message is required'],
    trim: true,
    maxlength: [2000, 'Feedback message cannot exceed 2000 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['new', 'read', 'resolved'],
    default: 'new',
  },
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
