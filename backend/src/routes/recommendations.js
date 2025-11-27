const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const spotifyService = require('../services/spotifyService');
const geminiService = require('../services/geminiService');
const mlService = require('../services/mlService');
const User = require('../models/User');
const Playlist = require('../models/Playlist');
const MoodSession = require('../models/MoodSession');

// Helper to validate MongoDB ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Helper to sanitize mood description
const sanitizeMoodInput = (input) => {
  if (typeof input !== 'string') return null;
  // Remove any HTML/script tags and limit length
  const cleaned = input.replace(/<[^>]*>/g, '').trim();
  if (cleaned.length === 0 || cleaned.length > 500) return null;
  return cleaned;
};

// Middleware to check authentication
const requireAuth = async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!isValidObjectId(req.session.userId)) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  const user = await User.findById(req.session.userId);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  // Refresh token if needed
  if (user.tokenExpiry < new Date()) {
    try {
      const tokens = await spotifyService.refreshAccessToken(user.refreshToken);
      user.accessToken = tokens.access_token;
      user.tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);
      await user.save();
    } catch (err) {
      return res.status(401).json({ error: 'Token refresh failed' });
    }
  }

  req.user = user;
  next();
};

// Get recommendations based on mood
router.post('/', requireAuth, async (req, res) => {
  const { playlistId, moodDescription, durationMinutes } = req.body;

  // Validate playlistId
  if (!playlistId || !isValidObjectId(playlistId)) {
    return res.status(400).json({ error: 'Invalid playlist ID' });
  }

  // Sanitize mood description
  const sanitizedMood = sanitizeMoodInput(moodDescription);
  if (!sanitizedMood) {
    return res.status(400).json({ error: 'Invalid mood description (1-500 characters required)' });
  }

  // Validate duration
  const duration = parseInt(durationMinutes, 10);
  if (isNaN(duration) || duration < 5 || duration > 480) {
    return res.status(400).json({ error: 'Duration must be between 5 and 480 minutes' });
  }

  try {
    // Get the playlist
    const playlist = await Playlist.findOne({
      _id: playlistId,
      userId: req.user._id
    });

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    if (!playlist.isProcessed) {
      return res.status(400).json({ error: 'Playlist has not been processed yet' });
    }

    // Analyze mood using Gemini
    const moodAnalysis = await geminiService.analyzeMood(sanitizedMood);

    // Convert duration to milliseconds
    const targetDuration = duration * 60 * 1000;

    // Get recommendations
    const recommendations = mlService.ruleBasedRecommendations(
      playlist.tracks,
      moodAnalysis,
      targetDuration
    );

    // Create mood session
    const session = await MoodSession.create({
      userId: req.user._id,
      playlistId: playlist._id,
      moodInput: sanitizedMood,
      processedMood: moodAnalysis,
      durationRequested: targetDuration,
      recommendedTracks: recommendations.tracks,
      actualDuration: recommendations.totalDuration
    });

    res.json({
      sessionId: session._id,
      moodAnalysis: {
        emotions: moodAnalysis.emotions,
        energyLevel: moodAnalysis.energy_level,
        valenceLevel: moodAnalysis.valence_level,
        moodCategory: moodAnalysis.mood_category,
        confidence: moodAnalysis.confidence
      },
      recommendations: recommendations.tracks,
      totalDuration: recommendations.totalDuration,
      totalDurationFormatted: formatDuration(recommendations.totalDuration),
      trackCount: recommendations.trackCount,
      requestedDuration: targetDuration,
      requestedDurationFormatted: formatDuration(targetDuration)
    });
  } catch (err) {
    console.error('Recommendation error:', err);
    res.status(500).json({ error: 'Failed to generate recommendations', details: err.message });
  }
});

// Get session history
router.get('/history', requireAuth, async (req, res) => {
  try {
    const sessions = await MoodSession.find({ userId: req.user._id })
      .populate('playlistId', 'name')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(sessions.map(s => ({
      id: s._id,
      playlistName: s.playlistId?.name,
      moodInput: s.moodInput,
      moodCategory: s.processedMood?.mood_category,
      trackCount: s.recommendedTracks.length,
      duration: formatDuration(s.actualDuration),
      savedToSpotify: s.savedToSpotify,
      createdAt: s.createdAt
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to get history' });
  }
});

// Get specific session
router.get('/:sessionId', requireAuth, async (req, res) => {
  if (!isValidObjectId(req.params.sessionId)) {
    return res.status(400).json({ error: 'Invalid session ID' });
  }

  try {
    const session = await MoodSession.findOne({
      _id: req.params.sessionId,
      userId: req.user._id
    }).populate('playlistId', 'name');

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      id: session._id,
      playlistName: session.playlistId?.name,
      moodInput: session.moodInput,
      moodAnalysis: session.processedMood,
      recommendations: session.recommendedTracks,
      totalDuration: session.actualDuration,
      totalDurationFormatted: formatDuration(session.actualDuration),
      savedToSpotify: session.savedToSpotify,
      spotifyPlaylistId: session.spotifyPlaylistId,
      createdAt: session.createdAt
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get session' });
  }
});

// Save recommendations to Spotify
router.post('/:sessionId/save', requireAuth, async (req, res) => {
  if (!isValidObjectId(req.params.sessionId)) {
    return res.status(400).json({ error: 'Invalid session ID' });
  }

  // Sanitize playlist name
  let { name } = req.body;
  if (name && typeof name === 'string') {
    name = name.replace(/<[^>]*>/g, '').trim().slice(0, 100);
  }

  try {
    const session = await MoodSession.findOne({
      _id: req.params.sessionId,
      userId: req.user._id
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.savedToSpotify) {
      return res.status(400).json({ 
        error: 'Already saved to Spotify',
        spotifyPlaylistId: session.spotifyPlaylistId 
      });
    }

    // Generate playlist description
    const description = await geminiService.generatePlaylistDescription(
      session.moodInput,
      session.recommendedTracks.length,
      session.actualDuration
    );

    // Create Spotify playlist
    const trackUris = session.recommendedTracks.map(t => `spotify:track:${t.trackId}`);
    const playlistName = name || `Mood: ${session.moodInput.slice(0, 30)}`;

    const spotifyPlaylist = await spotifyService.createPlaylist(
      req.user.accessToken,
      req.user.spotifyId,
      playlistName,
      description,
      trackUris
    );

    // Update session
    session.savedToSpotify = true;
    session.spotifyPlaylistId = spotifyPlaylist.id;
    await session.save();

    res.json({
      success: true,
      spotifyPlaylistId: spotifyPlaylist.id,
      spotifyPlaylistUrl: spotifyPlaylist.external_urls.spotify,
      name: playlistName
    });
  } catch (err) {
    console.error('Save to Spotify error:', err);
    res.status(500).json({ error: 'Failed to save to Spotify', details: err.message });
  }
});

// Helper function to format duration
function formatDuration(ms) {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${minutes}m`;
}

module.exports = router;
