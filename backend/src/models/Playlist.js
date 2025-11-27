const mongoose = require('mongoose');

const trackSchema = new mongoose.Schema({
  spotifyTrackId: {
    type: String,
    required: true
  },
  name: String,
  artist: String,
  artistId: String,
  album: String,
  albumImage: String,
  duration_ms: Number,
  previewUrl: String,
  externalUrl: String,
  audioFeatures: {
    danceability: Number,
    energy: Number,
    valence: Number,
    acousticness: Number,
    instrumentalness: Number,
    speechiness: Number,
    tempo: Number,
    loudness: Number,
    key: Number,
    mode: Number,
    liveness: Number
  },
  moodCategory: String,
  moodScore: Number
});

const playlistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  spotifyPlaylistId: {
    type: String,
    required: true
  },
  name: String,
  description: String,
  imageUrl: String,
  owner: String,
  totalTracks: Number,
  tracks: [trackSchema],
  moodCategories: {
    type: Map,
    of: [String]
  },
  processedAt: Date,
  isProcessed: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Playlist', playlistSchema);
