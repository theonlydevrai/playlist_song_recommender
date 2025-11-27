const mongoose = require('mongoose');

const moodSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  playlistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Playlist',
    required: true
  },
  moodInput: {
    type: String,
    required: true
  },
  processedMood: {
    emotions: [String],
    intensity: Number,
    context: String,
    energy_level: Number,
    valence_level: Number,
    mood_category: String,
    music_characteristics: {
      tempo_preference: String,
      energy_preference: String,
      danceability_preference: String,
      acousticness_preference: String
    }
  },
  durationRequested: Number,
  recommendedTracks: [{
    trackId: String,
    name: String,
    artist: String,
    duration_ms: Number,
    moodScore: Number,
    reason: String
  }],
  actualDuration: Number,
  savedToSpotify: {
    type: Boolean,
    default: false
  },
  spotifyPlaylistId: String
}, { timestamps: true });

module.exports = mongoose.model('MoodSession', moodSessionSchema);
