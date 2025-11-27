const express = require('express');
const router = express.Router();
const geminiService = require('../services/geminiService');
const mlService = require('../services/mlService');
const { playlistCache } = require('./playlists');

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
  if (!playlistId) {
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
    // Get the playlist from in-memory cache
    const playlist = playlistCache.get(playlistId);

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found. Please analyze a playlist first.' });
    }

    // Analyze mood using Gemini
    const moodAnalysis = await geminiService.analyzeMood(sanitizedMood);

    // Convert duration to milliseconds
    const targetDuration = duration * 60 * 1000;

    // Use tracks directly (already plain objects)
    const tracksData = playlist.tracks;
    
    // Debug log
    console.log(`Processing ${tracksData.length} tracks for ${duration} min playlist`);
    console.log(`Sample track:`, tracksData[0]?.name, tracksData[0]?.duration_ms);

    // Get recommendations
    const recommendations = await mlService.ruleBasedRecommendations(
      tracksData,
      moodAnalysis,
      targetDuration,
      sanitizedMood
    );

    res.json({
      playlistName: playlist.name,
      moodInput: sanitizedMood,
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
