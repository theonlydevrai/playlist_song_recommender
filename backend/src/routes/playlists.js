const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const spotifyService = require('../services/spotifyService');
const mlService = require('../services/mlService');
const User = require('../models/User');
const Playlist = require('../models/Playlist');

// Helper to validate MongoDB ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Helper to sanitize playlist URL
const sanitizePlaylistUrl = (url) => {
  if (typeof url !== 'string') return null;
  // Only allow Spotify URLs
  const spotifyUrlPattern = /^https?:\/\/(open\.)?spotify\.com\/playlist\/[a-zA-Z0-9]+/;
  const spotifyUriPattern = /^spotify:playlist:[a-zA-Z0-9]+$/;
  if (spotifyUrlPattern.test(url) || spotifyUriPattern.test(url)) {
    return url.trim();
  }
  return null;
};

// Middleware to check authentication
const requireAuth = async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Validate session userId is valid ObjectId
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

// Analyze a playlist
router.post('/analyze', requireAuth, async (req, res) => {
  const { playlistUrl } = req.body;

  // Validate and sanitize input
  const sanitizedUrl = sanitizePlaylistUrl(playlistUrl);
  if (!sanitizedUrl) {
    return res.status(400).json({ error: 'Invalid Spotify playlist URL' });
  }

  try {
    // Extract playlist ID from URL
    const playlistId = spotifyService.extractPlaylistId(sanitizedUrl);
    if (!playlistId) {
      return res.status(400).json({ error: 'Could not extract playlist ID from URL' });
    }

    // Check if playlist already exists
    let existingPlaylist = await Playlist.findOne({
      userId: req.user._id,
      spotifyPlaylistId: playlistId
    });

    if (existingPlaylist && existingPlaylist.isProcessed) {
      return res.json({
        playlistId: existingPlaylist._id,
        name: existingPlaylist.name,
        trackCount: existingPlaylist.totalTracks,
        status: 'already_processed',
        moodCategories: existingPlaylist.moodCategories
      });
    }

    // Get playlist info from Spotify
    const playlistInfo = await spotifyService.getPlaylist(req.user.accessToken, playlistId);
    
    // Get all tracks
    const tracks = await spotifyService.getPlaylistTracks(req.user.accessToken, playlistId);
    
    // Get audio features for all tracks
    const trackIds = tracks.map(t => t.spotifyTrackId);
    const audioFeatures = await spotifyService.getAudioFeatures(req.user.accessToken, trackIds);

    // Merge audio features with tracks
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].audioFeatures = audioFeatures[i] || null;
    }

    // Cluster tracks using ML service
    const clusterResult = mlService.ruleBasedClustering(tracks);

    // Save or update playlist
    if (existingPlaylist) {
      existingPlaylist.tracks = tracks;
      existingPlaylist.moodCategories = clusterResult.categories;
      existingPlaylist.isProcessed = true;
      existingPlaylist.processedAt = new Date();
      await existingPlaylist.save();
    } else {
      existingPlaylist = await Playlist.create({
        userId: req.user._id,
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
      trackCount: tracks.length,
      status: 'processed',
      moodCategories: Object.fromEntries(
        Object.entries(clusterResult.categories).map(([k, v]) => [k, v.length])
      )
    });
  } catch (err) {
    console.error('Playlist analysis error:', err);
    res.status(500).json({ error: 'Failed to analyze playlist', details: err.message });
  }
});

// Get user's playlists
router.get('/', requireAuth, async (req, res) => {
  try {
    const playlists = await Playlist.find({ userId: req.user._id })
      .select('name spotifyPlaylistId totalTracks imageUrl isProcessed processedAt')
      .sort({ processedAt: -1 });

    res.json(playlists);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get playlists' });
  }
});

// Get specific playlist with mood breakdown
router.get('/:id', requireAuth, async (req, res) => {
  // Validate ObjectId
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid playlist ID' });
  }

  try {
    const playlist = await Playlist.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

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
      const tracks = playlist.moodCategories?.get(category) || [];
      moodBreakdown[category] = {
        count: tracks.length,
        tracks: playlist.tracks.filter(t => tracks.includes(t.spotifyTrackId)).slice(0, 5)
      };
    }

    res.json({
      id: playlist._id,
      name: playlist.name,
      description: playlist.description,
      imageUrl: playlist.imageUrl,
      totalTracks: playlist.totalTracks,
      moodBreakdown,
      processedAt: playlist.processedAt
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get playlist' });
  }
});

// Delete a playlist from the app
router.delete('/:id', requireAuth, async (req, res) => {
  // Validate ObjectId
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid playlist ID' });
  }

  try {
    const result = await Playlist.deleteOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

module.exports = router;
