const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const geminiService = require('../services/geminiService');
const mlService = require('../services/mlService');
const Playlist = require('../models/Playlist');
const MoodSession = require('../models/MoodSession');

// Helper to validate MongoDB ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Helper to sanitize mood description
const sanitizeMoodInput = (input) => {
  if (typeof input !== 'string') return null;
  const cleaned = input.replace(/<[^>]*>/g, '').trim();
  if (cleaned.length === 0 || cleaned.length > 500) return null;
  return cleaned;
};

// Get recommendations based on mood
router.post('/', async (req, res) => {
  const { playlistId, moodDescription, durationMinutes } = req.body;

  // Validate playlistId
  if (!playlistId || !isValidObjectId(playlistId)) {
    return res.status(400).json({ error: 'Invalid playlist ID' });
  }

  // Sanitize mood description
  const sanitizedMood = sanitizeMoodInput(moodDescription);
  if (!sanitizedMood) {
    return res.status(400).json({ error: 'Please describe your mood (1-500 characters)' });
  }

  // Validate duration
  const duration = parseInt(durationMinutes, 10);
  if (isNaN(duration) || duration < 5 || duration > 480) {
    return res.status(400).json({ error: 'Duration must be between 5 and 480 minutes' });
  }

  try {
    // Get the playlist
    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found. Please analyze a playlist first.' });
    }

    if (!playlist.isProcessed) {
      return res.status(400).json({ error: 'Playlist has not been processed yet' });
    }

    // Analyze mood using Gemini
    const moodAnalysis = await geminiService.analyzeMood(sanitizedMood);

    // Convert duration to milliseconds
    const targetDuration = duration * 60 * 1000;

    // Convert Mongoose documents to plain objects for processing
    const tracksData = playlist.tracks.map(t => t.toObject ? t.toObject() : t);
    
    // Debug log
    console.log(`Processing ${tracksData.length} tracks for ${duration} min playlist`);
    console.log(`Sample track:`, tracksData[0]?.name, tracksData[0]?.duration_ms);

    // Get recommendations
    const recommendations = mlService.ruleBasedRecommendations(
      tracksData,
      moodAnalysis,
      targetDuration
    );

    // Ensure totalDuration is valid (fallback to 0 if NaN)
    const actualDuration = Number.isFinite(recommendations.totalDuration) 
      ? recommendations.totalDuration 
      : 0;

    // Create mood session for history
    const session = await MoodSession.create({
      playlistId: playlist._id,
      playlistName: playlist.name,
      moodInput: sanitizedMood,
      processedMood: moodAnalysis,
      durationRequested: targetDuration,
      recommendedTracks: recommendations.tracks,
      actualDuration: actualDuration
    });

    res.json({
      sessionId: session._id,
      playlistName: playlist.name,
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
    res.status(500).json({ error: 'Failed to generate recommendations. Please try again.' });
  }
});

// Get session history (recent sessions)
router.get('/history', async (req, res) => {
  try {
    const sessions = await MoodSession.find()
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(sessions.map(s => ({
      id: s._id,
      playlistName: s.playlistName,
      moodInput: s.moodInput,
      moodCategory: s.processedMood?.mood_category,
      trackCount: s.recommendedTracks.length,
      duration: formatDuration(s.actualDuration),
      createdAt: s.createdAt
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to get history' });
  }
});

// Get specific session
router.get('/:sessionId', async (req, res) => {
  if (!isValidObjectId(req.params.sessionId)) {
    return res.status(400).json({ error: 'Invalid session ID' });
  }

  try {
    const session = await MoodSession.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      id: session._id,
      playlistName: session.playlistName,
      moodInput: session.moodInput,
      moodAnalysis: session.processedMood,
      recommendations: session.recommendedTracks,
      totalDuration: session.actualDuration,
      totalDurationFormatted: formatDuration(session.actualDuration),
      createdAt: session.createdAt
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get session' });
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
