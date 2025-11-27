const express = require('express');
const router = express.Router();
const spotifyService = require('../services/spotifyService');
const User = require('../models/User');

// Get Spotify authorization URL
router.get('/spotify', (req, res) => {
  // Generate state for CSRF protection
  const state = spotifyService.generateState();
  req.session.oauthState = state;
  
  const authUrl = spotifyService.getAuthUrl(state);
  res.json({ url: authUrl });
});

// Handle Spotify callback
router.get('/callback', async (req, res) => {
  const { code, error, state } = req.query;

  // Verify state to prevent CSRF attacks
  if (!state || state !== req.session.oauthState) {
    return res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=invalid_state`);
  }
  
  // Clear the state after use
  delete req.session.oauthState;

  if (error) {
    return res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=missing_code`);
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
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

module.exports = router;
