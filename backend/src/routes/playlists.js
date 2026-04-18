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

const buildDemoTracks = () => {
  const seeds = [
    { name: 'City Lights', artist: 'Nova Echo', energy: 0.72, valence: 0.74, danceability: 0.78, acousticness: 0.18, instrumentalness: 0.05 },
    { name: 'Quiet Orbit', artist: 'Luma Drift', energy: 0.35, valence: 0.62, danceability: 0.40, acousticness: 0.55, instrumentalness: 0.31 },
    { name: 'Warm Coffee Loops', artist: 'Paper Skies', energy: 0.28, valence: 0.66, danceability: 0.44, acousticness: 0.60, instrumentalness: 0.42 },
    { name: 'Neon Running', artist: 'Pulse Avenue', energy: 0.86, valence: 0.67, danceability: 0.82, acousticness: 0.10, instrumentalness: 0.02 },
    { name: 'Sunset Notebook', artist: 'Mira Lane', energy: 0.41, valence: 0.58, danceability: 0.50, acousticness: 0.48, instrumentalness: 0.20 },
    { name: 'Cloud Memory', artist: 'North Harbour', energy: 0.22, valence: 0.47, danceability: 0.33, acousticness: 0.71, instrumentalness: 0.52 },
    { name: 'Blue Arcade', artist: 'Static Flora', energy: 0.64, valence: 0.69, danceability: 0.73, acousticness: 0.24, instrumentalness: 0.09 },
    { name: 'After Midnight Train', artist: 'Velvet Signals', energy: 0.57, valence: 0.36, danceability: 0.55, acousticness: 0.31, instrumentalness: 0.14 },
    { name: 'Golden Static', artist: 'Rooftop Birds', energy: 0.49, valence: 0.81, danceability: 0.58, acousticness: 0.33, instrumentalness: 0.11 },
    { name: 'Lakehouse Tempo', artist: 'Comet Parade', energy: 0.68, valence: 0.71, danceability: 0.76, acousticness: 0.21, instrumentalness: 0.06 },
    { name: 'Inner Compass', artist: 'June Atlas', energy: 0.46, valence: 0.52, danceability: 0.47, acousticness: 0.45, instrumentalness: 0.27 },
    { name: 'Slow Arcade Rain', artist: 'Echo Harbor', energy: 0.30, valence: 0.43, danceability: 0.36, acousticness: 0.63, instrumentalness: 0.44 }
  ];

  return seeds.map((seed, idx) => ({
    spotifyTrackId: `demo-${idx + 1}`,
    name: seed.name,
    artist: seed.artist,
    artistId: `demo-artist-${idx + 1}`,
    allArtistIds: [`demo-artist-${idx + 1}`],
    album: 'Demo Session',
    albumImage: null,
    duration_ms: 165000 + (idx * 7000),
    previewUrl: null,
    externalUrl: null,
    spotifyUri: `spotify:track:demo-${idx + 1}`,
    releaseDate: '2024-01-01',
    popularity: 60,
    explicit: false,
    trackNumber: idx + 1,
    discNumber: 1,
    genres: ['indie', 'electronic'],
    moodCategory: null,
    audioFeatures: {
      energy: seed.energy,
      valence: seed.valence,
      danceability: seed.danceability,
      acousticness: seed.acousticness,
      instrumentalness: seed.instrumentalness,
      tempo: 95 + (idx * 3),
      loudness: -8 + (idx * 0.2),
      speechiness: 0.05,
      liveness: 0.12,
      key: idx % 12,
      mode: 1,
      time_signature: 4,
      _source: 'demo_fallback'
    }
  }));
};

const isSpotifyPremiumRestriction = (err) => {
  const status = err?.response?.status;
  const body = String(err?.response?.data || '').toLowerCase();
  return status === 403 && body.includes('active premium subscription required');
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

    if (isSpotifyPremiumRestriction(err)) {
      const playlistId = spotifyService.extractPlaylistId(sanitizedUrl) || `demo-${Date.now()}`;
      const demoTracks = buildDemoTracks();
      const playlistData = {
        id: playlistId,
        spotifyPlaylistId: playlistId,
        name: 'Demo Playlist (Spotify Restricted)',
        description: 'Fallback playlist generated because Spotify API credentials are restricted.',
        imageUrl: null,
        owner: 'Demo Mode',
        totalTracks: demoTracks.length,
        tracks: demoTracks,
        processedAt: new Date()
      };

      playlistCache.set(playlistId, playlistData);

      return res.json({
        playlistId,
        name: playlistData.name,
        description: playlistData.description,
        imageUrl: playlistData.imageUrl,
        owner: playlistData.owner,
        trackCount: demoTracks.length,
        status: 'demo_fallback',
        warning: 'Spotify API access is restricted for the configured app owner. Running in demo mode.'
      });
    }
    
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
