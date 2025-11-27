const mongoose = require('mongoose');

const moodSessionSchema = new mongoose.Schema({
  playlistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Playlist',
    required: true
  },
  playlistName: String,
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
    album: String,
    albumImage: String,
    duration_ms: Number,
    moodScore: Number,
    reason: String,
    externalUrl: String,
    spotifyUri: String
  }],
  actualDuration: Number
}, { timestamps: true });

module.exports = mongoose.model('MoodSession', moodSessionSchema);
