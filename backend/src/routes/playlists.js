const express = require('express');
const router = express.Router();
const spotifyService = require('../services/spotifyService');
const mlService = require('../services/mlService');
const geminiService = require('../services/geminiService');

// In-memory cache for analyzed playlists (per session)
const playlistCache = new Map();

// Helper to sanitize playlist URL
const sanitizePlaylistUrl = (url) => {
  if (typeof url !== 'string') return null;
  const spotifyUrlPattern = /^https?:\/\/(open\.)?spotify\.com\/playlist\/[a-zA-Z0-9]+/;
  const spotifyUriPattern = /^spotify:playlist:[a-zA-Z0-9]+$/;
  if (spotifyUrlPattern.test(url) || spotifyUriPattern.test(url)) {
    return url.trim();
  }
  return null;
};

// Analyze a public playlist
router.post('/analyze', async (req, res) => {
  const { playlistUrl } = req.body;

  // Validate and sanitize input
  const sanitizedUrl = sanitizePlaylistUrl(playlistUrl);
  if (!sanitizedUrl) {
    return res.status(400).json({ error: 'Invalid Spotify playlist URL. Please use a public playlist URL.' });
  }

  try {
    // Extract playlist ID from URL
    const playlistId = spotifyService.extractPlaylistId(sanitizedUrl);
    if (!playlistId) {
      return res.status(400).json({ error: 'Could not extract playlist ID from URL' });
    }

    // Get playlist info from Spotify
    const playlistInfo = await spotifyService.getPlaylist(playlistId);
    
    // Check if playlist is public
    if (playlistInfo.public === false) {
      return res.status(400).json({ 
        error: 'This playlist is private. Please use a public playlist URL.' 
      });
    }

    // Get all tracks
    const tracks = await spotifyService.getPlaylistTracks(playlistId);
    
    if (tracks.length === 0) {
      return res.status(400).json({ error: 'Playlist is empty or has no accessible tracks' });
    }

    console.log(`✅ Fetched ${tracks.length} tracks from Spotify`);
    
    // SKIP AI ANALYSIS during load - just show Spotify data for speed
    // AI analysis will happen later during recommendation generation
    
    // Enrich tracks with real Spotify audio features and genres (fast!)
    console.log(`🎵 Enriching tracks with Spotify audio features...`);
    await spotifyService.enrichTracksWithFeaturesAndGenres(tracks);
    
    // For tracks without audio features, add basic estimated ones
    for (const track of tracks) {
      if (!track.audioFeatures) {
        track.audioFeatures = spotifyService.estimateAudioFeatures(track);
      }
      // Don't set moodCategory yet - will be analyzed during recommendation
      track.moodCategory = null;
    }

    console.log(`✅ Playlist ready for selection`);

    // Build playlist data object
    const playlistData = {
      id: playlistId,
      spotifyPlaylistId: playlistId,
      name: playlistInfo.name,
      description: playlistInfo.description,
      imageUrl: playlistInfo.images?.[0]?.url,
      owner: playlistInfo.owner.display_name,
      totalTracks: tracks.length,
      tracks,
      processedAt: new Date()
    };

    // Store in memory cache
    playlistCache.set(playlistId, playlistData);

    res.json({
      playlistId: playlistId,
      name: playlistData.name,
      description: playlistData.description,
      imageUrl: playlistData.imageUrl,
      owner: playlistData.owner,
      trackCount: tracks.length,
      status: 'processed'
    });
  } catch (err) {
    console.error('Playlist analysis error:', err);
    
    // Handle Spotify API errors
    if (err.response?.status === 404) {
      return res.status(404).json({ error: 'Playlist not found. Make sure the URL is correct and the playlist is public.' });
    }
    if (err.response?.status === 401 || err.response?.status === 403) {
      return res.status(400).json({ error: 'Cannot access this playlist. Make sure it is public.' });
    }
    
    res.status(500).json({ error: 'Failed to analyze playlist. Please try again.' });
  }
});

// Get specific playlist with mood breakdown
router.get('/:id', async (req, res) => {
  const playlistId = req.params.id;
  
  // Check in-memory cache
  const playlist = playlistCache.get(playlistId);

  if (!playlist) {
    return res.status(404).json({ error: 'Playlist not found. Please analyze a playlist first.' });
  }

  res.json({
    id: playlist.id,
    _id: playlist.id,  // Include both for compatibility
    spotifyPlaylistId: playlist.spotifyPlaylistId,
    name: playlist.name,
    description: playlist.description,
    imageUrl: playlist.imageUrl,
    owner: playlist.owner,
    totalTracks: playlist.totalTracks,
    allTracks: playlist.tracks, // Return all tracks with Spotify audio features for selection UI
    processedAt: playlist.processedAt
  });
});

// Export playlistCache for use in recommendations route
module.exports = router;
module.exports.playlistCache = playlistCache;
