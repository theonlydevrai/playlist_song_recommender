const axios = require('axios');

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

class SpotifyService {
  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID;
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    this.redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  }

  getAuthUrl() {
    const scopes = [
      'playlist-read-private',
      'playlist-read-collaborative',
      'playlist-modify-public',
      'playlist-modify-private',
      'user-read-private',
      'user-read-email'
    ];

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: scopes.join(' '),
      show_dialog: 'true'
    });

    return `${SPOTIFY_AUTH_URL}?${params.toString()}`;
  }

  async getTokens(code) {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri
    });

    const response = await axios.post(SPOTIFY_TOKEN_URL, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
      }
    });

    return response.data;
  }

  async refreshAccessToken(refreshToken) {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    });

    const response = await axios.post(SPOTIFY_TOKEN_URL, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
      }
    });

    return response.data;
  }

  async getUserProfile(accessToken) {
    const response = await axios.get(`${SPOTIFY_API_URL}/me`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    return response.data;
  }

  async getPlaylist(accessToken, playlistId) {
    const response = await axios.get(`${SPOTIFY_API_URL}/playlists/${playlistId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    return response.data;
  }

  async getPlaylistTracks(accessToken, playlistId) {
    const tracks = [];
    let url = `${SPOTIFY_API_URL}/playlists/${playlistId}/tracks?limit=100`;

    while (url) {
      const response = await axios.get(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
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
          externalUrl: item.track.external_urls.spotify
        }));

      tracks.push(...items);
      url = response.data.next;
    }

    return tracks;
  }

  async getAudioFeatures(accessToken, trackIds) {
    const features = [];
    // Spotify allows max 100 tracks per request
    for (let i = 0; i < trackIds.length; i += 100) {
      const batch = trackIds.slice(i, i + 100);
      const response = await axios.get(`${SPOTIFY_API_URL}/audio-features`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        params: { ids: batch.join(',') }
      });
      features.push(...response.data.audio_features);
    }
    return features;
  }

  async createPlaylist(accessToken, userId, name, description, trackUris) {
    // Create the playlist
    const createResponse = await axios.post(
      `${SPOTIFY_API_URL}/users/${userId}/playlists`,
      {
        name,
        description,
        public: false
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const playlistId = createResponse.data.id;

    // Add tracks to the playlist
    if (trackUris.length > 0) {
      await axios.post(
        `${SPOTIFY_API_URL}/playlists/${playlistId}/tracks`,
        { uris: trackUris },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    return createResponse.data;
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
}

module.exports = new SpotifyService();
