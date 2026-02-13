const axios = require('axios');

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

class SpotifyService {
  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID;
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // Get app-level access token (Client Credentials Flow)
  // No user login required - works for public data only
  async getAccessToken() {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const params = new URLSearchParams({
        grant_type: 'client_credentials'
      });

      console.log('🔑 Requesting Spotify access token...');
      const response = await axios.post(SPOTIFY_TOKEN_URL, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
        }
      });

      this.accessToken = response.data.access_token;
      // Set expiry 5 minutes before actual expiry for safety
      this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;
      
      console.log('✅ Spotify access token obtained');
      return this.accessToken;
    } catch (error) {
      console.error('❌ Failed to get Spotify access token:', error.response?.data || error.message);
      throw error;
    }
  }

  async getPlaylist(playlistId) {
    const token = await this.getAccessToken();
    
    const response = await axios.get(`${SPOTIFY_API_URL}/playlists/${playlistId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      params: { fields: 'id,name,description,images,owner,public,tracks.total' }
    });
    
    return response.data;
  }

  async getPlaylistTracks(playlistId) {
    const token = await this.getAccessToken();
    const tracks = [];
    let url = `${SPOTIFY_API_URL}/playlists/${playlistId}/tracks?limit=100`;

    while (url) {
      const response = await axios.get(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const items = response.data.items
        .filter(item => item.track && item.track.id)
        .map(item => ({
          spotifyTrackId: item.track.id,
          name: item.track.name,
          artist: item.track.artists.map(a => a.name).join(', '),
          artistId: item.track.artists[0]?.id, // Primary artist ID
          allArtistIds: item.track.artists.map(a => a.id),
          album: item.track.album.name,
          albumImage: item.track.album.images[0]?.url,
          duration_ms: item.track.duration_ms,
          previewUrl: item.track.preview_url,
          externalUrl: item.track.external_urls.spotify,
          spotifyUri: item.track.uri,
          // Include additional metadata for mood estimation
          releaseDate: item.track.album.release_date,
          popularity: item.track.popularity,
          explicit: item.track.explicit,
          trackNumber: item.track.track_number,
          discNumber: item.track.disc_number
        }));

      tracks.push(...items);
      url = response.data.next;
    }

    // Enhance tracks with Audio Features and Genres
    await this.enrichTracksWithFeaturesAndGenres(tracks);

    return tracks;
  }

  async enrichTracksWithFeaturesAndGenres(tracks) {
    if (tracks.length === 0) return;

    const token = await this.getAccessToken();
    const trackIds = tracks.map(t => t.spotifyTrackId);
    const artistIds = [...new Set(tracks.map(t => t.artistId).filter(id => id))];

    console.log(`📊 Fetching audio features for ${trackIds.length} tracks...`);
    
    // 1. Fetch Audio Features (Batch of 100)
    let audioFeaturesSuccess = 0;
    try {
      for (let i = 0; i < trackIds.length; i += 100) {
        const batch = trackIds.slice(i, i + 100);
        console.log(`   Requesting audio features for batch ${Math.floor(i/100) + 1} (${batch.length} tracks)...`);
        
        const response = await axios.get(`${SPOTIFY_API_URL}/audio-features`, {
          headers: { 'Authorization': `Bearer ${token}` },
          params: { ids: batch.join(',') }
        });
        
        response.data.audio_features.forEach(features => {
          if (features) {
            const track = tracks.find(t => t.spotifyTrackId === features.id);
            if (track) {
              track.audioFeatures = {
                energy: features.energy,
                valence: features.valence,
                danceability: features.danceability,
                acousticness: features.acousticness,
                instrumentalness: features.instrumentalness,
                tempo: features.tempo,
                loudness: features.loudness,
                speechiness: features.speechiness,
                liveness: features.liveness,
                key: features.key,
                mode: features.mode,
                time_signature: features.time_signature,
                _source: 'spotify_api'
              };
              audioFeaturesSuccess++;
            }
          }
        });
      }
      console.log(`✅ Got audio features for ${audioFeaturesSuccess}/${trackIds.length} tracks`);
    } catch (error) {
      console.error('❌ Failed to fetch audio features (batch endpoint):', error.response?.data || error.message);
      console.log('⚠️  Skipping audio enrichment and continuing with tracks only.');
      return;
    }

    // 2. Fetch Artist Genres (Batch of 50)
    let genresSuccess = 0;
    try {
      const artistMap = {};
      for (let i = 0; i < artistIds.length; i += 50) {
        const batch = artistIds.slice(i, i + 50);
        const response = await axios.get(`${SPOTIFY_API_URL}/artists`, {
          headers: { 'Authorization': `Bearer ${token}` },
          params: { ids: batch.join(',') }
        });

        response.data.artists.forEach(artist => {
          artistMap[artist.id] = artist.genres;
        });
      }

      tracks.forEach(track => {
        if (track.artistId && artistMap[track.artistId]) {
          track.genres = artistMap[track.artistId];
          if (track.genres.length > 0) genresSuccess++;
        } else {
          track.genres = [];
        }
      });
      console.log(`✅ Got genres for ${genresSuccess}/${tracks.length} tracks`);
    } catch (error) {
      console.error('❌ Failed to fetch artist genres:', error.response?.data || error.message);
    }
  }

  // Generate estimated audio features based on track metadata
  // This is a fallback since Spotify deprecated the Audio Features API
  estimateAudioFeatures(track) {
    // Use heuristics based on available metadata
    const popularity = (track.popularity || 50) / 100;
    
    // Estimate energy based on popularity and explicit content
    let energy = 0.5 + (popularity * 0.2);
    if (track.explicit) energy += 0.1;
    
    // Estimate valence (positivity) - harder without audio analysis
    // Use a default middle-ground with slight variation
    let valence = 0.5 + (Math.random() * 0.2 - 0.1);
    
    // Estimate danceability based on popularity
    let danceability = 0.5 + (popularity * 0.3);
    
    // Clamp values
    energy = Math.max(0, Math.min(1, energy));
    valence = Math.max(0, Math.min(1, valence));
    danceability = Math.max(0, Math.min(1, danceability));
    
    return {
      energy,
      valence,
      danceability,
      acousticness: 0.3,
      instrumentalness: 0.1,
      tempo: 120,
      // Flag that these are estimated
      _estimated: true
    };
  }

  extractPlaylistId(url) {
    // Handle various Spotify URL formats
    const patterns = [
      /playlist\/([a-zA-Z0-9]+)/,
      /spotify:playlist:([a-zA-Z0-9]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  // Generate Spotify URI for a list of track IDs (for manual copying)
  generateTrackUris(trackIds) {
    return trackIds.map(id => `spotify:track:${id}`);
  }
}

module.exports = new SpotifyService();
