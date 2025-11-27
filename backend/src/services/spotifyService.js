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

    const params = new URLSearchParams({
      grant_type: 'client_credentials'
    });

    const response = await axios.post(SPOTIFY_TOKEN_URL, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
      }
    });

    this.accessToken = response.data.access_token;
    // Set expiry 5 minutes before actual expiry for safety
    this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;

    return this.accessToken;
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
          artistId: item.track.artists[0]?.id,
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

    return tracks;
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
