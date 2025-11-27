const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const spotifyService = require('../services/spotifyService');
const mlService = require('../services/mlService');
const geminiService = require('../services/geminiService');
const Playlist = require('../models/Playlist');

// Helper to validate MongoDB ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

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

    // Check if playlist already analyzed (cache)
    let existingPlaylist = await Playlist.findOne({ spotifyPlaylistId: playlistId });

    if (existingPlaylist && existingPlaylist.isProcessed) {
      // Return cached result
      return res.json({
        playlistId: existingPlaylist._id,
        name: existingPlaylist.name,
        description: existingPlaylist.description,
        imageUrl: existingPlaylist.imageUrl,
        owner: existingPlaylist.owner,
        trackCount: existingPlaylist.totalTracks,
        status: 'cached',
        moodCategories: Object.fromEntries(
          Object.entries(existingPlaylist.moodCategories?.toObject() || {}).map(([k, v]) => [k, v.length])
        )
      });
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

    // Debug: log sample track data
    console.log(`Fetched ${tracks.length} tracks from Spotify`);
    console.log(`Sample track:`, {
      name: tracks[0]?.name,
      artist: tracks[0]?.artist,
      duration_ms: tracks[0]?.duration_ms,
      album: tracks[0]?.album
    });

    // Use Gemini to analyze track moods from song names and artists
    // This replaces the deprecated Spotify Audio Features API
    console.log(`Analyzing ${tracks.length} tracks with AI...`);
    const trackMoodMap = await geminiService.analyzeTracksMood(tracks);

    // Apply mood analysis to tracks
    for (const track of tracks) {
      const aiMood = trackMoodMap?.[track.name.toLowerCase()];
      
      if (aiMood) {
        // Use AI-analyzed mood data
        track.audioFeatures = {
          energy: aiMood.energy,
          valence: aiMood.valence,
          danceability: aiMood.danceability,
          acousticness: 0.3,
          instrumentalness: 0.1,
          tempo: 120,
          _source: 'gemini'
        };
        track.moodCategory = aiMood.category;
      } else {
        // Fallback to estimated features
        track.audioFeatures = spotifyService.estimateAudioFeatures(track);
      }
    }

    // Cluster tracks using ML service
    const clusterResult = mlService.ruleBasedClustering(tracks);

    // Save or update playlist
    if (existingPlaylist) {
      existingPlaylist.name = playlistInfo.name;
      existingPlaylist.description = playlistInfo.description;
      existingPlaylist.imageUrl = playlistInfo.images?.[0]?.url;
      existingPlaylist.owner = playlistInfo.owner.display_name;
      existingPlaylist.tracks = tracks;
      existingPlaylist.moodCategories = clusterResult.categories;
      existingPlaylist.totalTracks = tracks.length;
      existingPlaylist.isProcessed = true;
      existingPlaylist.processedAt = new Date();
      await existingPlaylist.save();
    } else {
      existingPlaylist = await Playlist.create({
        spotifyPlaylistId: playlistId,
        name: playlistInfo.name,
        description: playlistInfo.description,
        imageUrl: playlistInfo.images?.[0]?.url,
        owner: playlistInfo.owner.display_name,
        totalTracks: tracks.length,
        tracks,
        moodCategories: clusterResult.categories,
        isProcessed: true,
        processedAt: new Date()
      });
    }

    res.json({
      playlistId: existingPlaylist._id,
      name: existingPlaylist.name,
      description: existingPlaylist.description,
      imageUrl: existingPlaylist.imageUrl,
      owner: existingPlaylist.owner,
      trackCount: tracks.length,
      status: 'processed',
      moodCategories: Object.fromEntries(
        Object.entries(clusterResult.categories).map(([k, v]) => [k, v.length])
      )
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

// Get recently analyzed playlists
router.get('/recent', async (req, res) => {
  try {
    const playlists = await Playlist.find({ isProcessed: true })
      .select('name spotifyPlaylistId totalTracks imageUrl owner processedAt')
      .sort({ processedAt: -1 })
      .limit(10);

    res.json(playlists);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get playlists' });
  }
});

// Get specific playlist with mood breakdown
router.get('/:id', async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid playlist ID' });
  }

  try {
    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    // Get mood category counts
    const moodBreakdown = {};
    const categoryOrder = [
      'happy_energetic', 'calm_peaceful', 'melancholic', 'party_dance',
      'romantic', 'motivational', 'chill_ambient', 'intense_aggressive'
    ];

    for (const category of categoryOrder) {
      const trackIds = playlist.moodCategories?.get(category) || [];
      moodBreakdown[category] = {
        count: trackIds.length,
        tracks: playlist.tracks.filter(t => trackIds.includes(t.spotifyTrackId)).slice(0, 5)
      };
    }

    res.json({
      id: playlist._id,
      _id: playlist._id,  // Include both for compatibility
      spotifyPlaylistId: playlist.spotifyPlaylistId,
      name: playlist.name,
      description: playlist.description,
      imageUrl: playlist.imageUrl,
      owner: playlist.owner,
      totalTracks: playlist.totalTracks,
      moodBreakdown,
      processedAt: playlist.processedAt
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get playlist' });
  }
});

module.exports = router;
