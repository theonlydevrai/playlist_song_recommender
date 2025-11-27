const express = require('express');
const router = express.Router();
const spotifyService = require('../services/spotifyService');
const User = require('../models/User');

// Get Spotify authorization URL
router.get('/spotify', (req, res) => {
  const authUrl = spotifyService.getAuthUrl();
  res.json({ url: authUrl });
});

// Handle Spotify callback
router.get('/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=${error}`);
  }

  try {
    // Get tokens from Spotify
    const tokens = await spotifyService.getTokens(code);
    
    // Get user profile
    const profile = await spotifyService.getUserProfile(tokens.access_token);

    // Create or update user in database
    let user = await User.findOne({ spotifyId: profile.id });
    
    if (user) {
      user.accessToken = tokens.access_token;
      user.refreshToken = tokens.refresh_token || user.refreshToken;
      user.tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);
      user.lastLogin = new Date();
      await user.save();
    } else {
      user = await User.create({
        spotifyId: profile.id,
        email: profile.email,
        displayName: profile.display_name,
        profileImage: profile.images?.[0]?.url,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000)
      });
    }

    // Set session
    req.session.userId = user._id;
    req.session.spotifyId = user.spotifyId;

    // Redirect to frontend
    res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
  } catch (err) {
    console.error('Auth callback error:', err);
    res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=authentication_failed`);
  }
});

// Get current user
router.get('/user', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Check if token needs refresh
    if (user.tokenExpiry < new Date()) {
      const tokens = await spotifyService.refreshAccessToken(user.refreshToken);
      user.accessToken = tokens.access_token;
      user.tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);
      await user.save();
    }

    res.json({
      id: user._id,
      spotifyId: user.spotifyId,
      displayName: user.displayName,
      email: user.email,
      profileImage: user.profileImage
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

module.exports = router;
