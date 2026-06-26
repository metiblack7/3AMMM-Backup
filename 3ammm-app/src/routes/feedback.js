const express = require('express');
const Feedback = require('../models/Feedback');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// POST /api/feedback — submit feedback from authenticated user
router.post('/', protect, async (req, res) => {
  try {
    const { message, email } = req.body;

    if (!message || !email) {
      return res.status(400).json({ message: 'Message and email are required' });
    }

    const feedback = new Feedback({
      userId: req.user.id,
      message,
      email,
    });

    await feedback.save();
    res.status(201).json({ message: 'Feedback submitted successfully', feedback });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/feedback — admin: get all feedback
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const feedback = await Feedback.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    res.json(feedback);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
