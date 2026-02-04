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
  const { playlistId, moodDescription, moods, durationMinutes } = req.body;

  // Validate playlistId
  if (!playlistId) {
    return res.status(400).json({ error: 'Invalid playlist ID' });
  }

  // Support both single mood and mood transition
  let moodSequence = [];
  let isMoodTransition = false;

  if (moods && Array.isArray(moods) && moods.length > 0) {
    // Mood transition mode
    isMoodTransition = true;
    moodSequence = moods.map(m => sanitizeMoodInput(m)).filter(m => m);
    if (moodSequence.length === 0) {
      return res.status(400).json({ error: 'Please provide valid moods (1-500 characters each)' });
    }
  } else if (moodDescription) {
    // Single mood mode (backward compatible)
    const sanitizedMood = sanitizeMoodInput(moodDescription);
    if (!sanitizedMood) {
      return res.status(400).json({ error: 'Please describe your mood (1-500 characters)' });
    }
    moodSequence = [sanitizedMood];
  } else {
    return res.status(400).json({ error: 'Please provide either moodDescription or moods array' });
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

    // Convert duration to milliseconds
    const targetDuration = duration * 60 * 1000;

    // Use tracks directly (already plain objects)
    const tracksData = playlist.tracks;
    
    // Debug log
    console.log(`Processing ${tracksData.length} tracks for ${duration} min playlist`);
    console.log(`Mood sequence:`, moodSequence);

    let recommendations;

    if (isMoodTransition && moodSequence.length > 1) {
      // MOOD TRANSITION MODE
      const moodTransitionAnalysis = await geminiService.analyzeMoodTransitions(
        moodSequence, 
        tracksData,
        req.body.selectedTrackIds || []
      );
      
      recommendations = await mlService.moodTransitionRecommendations(
        tracksData,
        moodTransitionAnalysis,
        targetDuration,
        moodSequence,
        req.body.selectedTrackIds || []
      );

      res.json({
        playlistName: playlist.name,
        moodSequence: moodSequence,
        transitionMode: true,
        moodSegments: recommendations.segments,
        recommendations: recommendations.tracks,
        totalDuration: recommendations.totalDuration,
        totalDurationFormatted: formatDuration(recommendations.totalDuration),
        trackCount: recommendations.trackCount,
        requestedDuration: targetDuration,
        requestedDurationFormatted: formatDuration(targetDuration)
      });
    } else {
      // SINGLE MOOD MODE (existing logic)
      const moodAnalysis = await geminiService.analyzeMood(moodSequence[0]);

      recommendations = await mlService.ruleBasedRecommendations(
        tracksData,
        moodAnalysis,
        targetDuration,
        moodSequence[0],
        req.body.selectedTrackIds || []
      );

      res.json({
        playlistName: playlist.name,
        moodInput: moodSequence[0],
        transitionMode: false,
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
    }
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
