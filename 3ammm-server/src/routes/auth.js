const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, singerName } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already registered.' });

    const user = await User.create({
      name,
      email,
      password,
      singerName: singerName || name,
      role: 'worshiper',
    });

    const token = signToken(user._id);
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/google - Google OAuth authentication
router.post('/google', async (req, res) => {
  try {
    const { googleToken } = req.body;
    if (!googleToken) {
      return res.status(400).json({ message: 'Google token is required.' });
    }

    // Exchange authorization code for tokens
    let googleUser;
    let accessToken;

    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: googleToken,
          client_id: process.env.GOOGLE_CLIENT_ID || '204274728519-mjf0vtp5jj8gjltcff1ts8g5dv4lsn9v.apps.googleusercontent.com',
          client_secret: process.env.GOOGLE_CLIENT_SECRET || '', // You need to set this
          redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'com.ammm.worship://',
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange authorization code');
      }

      const tokens = await tokenResponse.json();
      accessToken = tokens.access_token;
      const idToken = tokens.id_token;

      // Decode ID token to get user info
      if (idToken) {
        try {
          const parts = idToken.split('.');
          const payload = Buffer.from(parts[1], 'base64').toString('utf8');
          googleUser = JSON.parse(payload);
        } catch (err) {
          // Fallback: fetch user info using access token
          const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          googleUser = await userResponse.json();
        }
      }
    } catch (err) {
      // Fallback: treat the token as access token directly
      accessToken = googleToken;
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!userResponse.ok) {
        throw new Error('Invalid Google token');
      }
      googleUser = await userResponse.json();
    }

    if (!googleUser || !googleUser.email) {
      return res.status(400).json({ message: 'Unable to get user info from Google' });
    }

    // Find or create user
    let user = await User.findOne({ email: googleUser.email });

    if (!user) {
      // Create new user with Google OAuth
      user = await User.create({
        name: googleUser.name || 'User',
        email: googleUser.email,
        singerName: googleUser.name || 'User',
        googleEmail: googleUser.email,
        role: 'worshiper',
        // No password for OAuth users
      });
    } else if (!user.googleEmail) {
      // Link existing account to Google
      user.googleEmail = googleUser.email;
      await user.save();
    }

    const token = signToken(user._id);
    res.status(200).json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signToken(user._id);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me  — get current user profile
router.get('/me', protect, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
