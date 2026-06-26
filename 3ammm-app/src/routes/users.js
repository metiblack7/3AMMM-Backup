const express = require('express');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/users — admin: all users
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users/stats — admin: dashboard stats
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const [totalSongs, totalSetlists, totalUsers, singers] = await Promise.all([
      require('../models/Song').countDocuments(),
      require('../models/Setlist').countDocuments(),
      User.countDocuments({ role: 'worshiper' }),
      require('../models/Song').distinct('singerName'),
    ]);
    res.json({
      totalSongs,
      totalSetlists,
      totalWorshipers: totalUsers,
      totalSingers: singers.length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/users/push-token — save push notification token for current user
router.post('/push-token', protect, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Push token is required' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { pushToken: token },
      { new: true }
    );

    res.json({ message: 'Push token saved', user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
