const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5000';

class MLService {
  async clusterTracks(tracks) {
    try {
      const response = await axios.post(`${ML_SERVICE_URL}/cluster`, {
        tracks: tracks.map(t => ({
          id: t.spotifyTrackId,
          features: t.audioFeatures
        }))
      });
      return response.data;
    } catch (error) {
      console.error('ML Service error:', error.message);
      // Fallback to rule-based clustering
      return this.ruleBasedClustering(tracks);
    }
  }

  ruleBasedClustering(tracks) {
    const categories = {
      happy_energetic: [],
      calm_peaceful: [],
      melancholic: [],
      party_dance: [],
      romantic: [],
      motivational: [],
      chill_ambient: [],
      intense_aggressive: []
    };

    for (const track of tracks) {
      const f = track.audioFeatures;
      if (!f) continue;

      let category = 'calm_peaceful';

      if (f.valence > 0.7 && f.energy > 0.7) {
        category = 'happy_energetic';
      } else if (f.energy < 0.4 && f.valence > 0.4 && f.valence < 0.7) {
        category = 'calm_peaceful';
      } else if (f.valence < 0.4 && f.energy < 0.6) {
        category = 'melancholic';
      } else if (f.danceability > 0.7 && f.energy > 0.7) {
        category = 'party_dance';
      } else if (f.valence > 0.5 && f.energy < 0.5 && f.acousticness > 0.3) {
        category = 'romantic';
      } else if (f.energy > 0.7 && f.valence > 0.5) {
        category = 'motivational';
      } else if (f.energy < 0.3 && f.instrumentalness > 0.3) {
        category = 'chill_ambient';
      } else if (f.energy > 0.8 && f.valence < 0.4) {
        category = 'intense_aggressive';
      }

      categories[category].push(track.spotifyTrackId);
      track.moodCategory = category;
    }

    return { categories, tracks };
  }

  async getRecommendations(tracks, moodAnalysis, targetDuration) {
    try {
      const response = await axios.post(`${ML_SERVICE_URL}/recommend`, {
        tracks: tracks.map(t => ({
          id: t.spotifyTrackId,
          name: t.name,
          artist: t.artist,
          duration_ms: t.duration_ms,
          features: t.audioFeatures,
          moodCategory: t.moodCategory
        })),
        moodAnalysis,
        targetDuration
      });
      return response.data;
    } catch (error) {
      console.error('ML Service recommendation error:', error.message);
      // Fallback to rule-based recommendations
      return this.ruleBasedRecommendations(tracks, moodAnalysis, targetDuration);
    }
  }

  ruleBasedRecommendations(tracks, moodAnalysis, targetDuration) {
    const targetCategory = moodAnalysis.mood_category;
    const energyLevel = moodAnalysis.energy_level / 10;
    const valenceLevel = moodAnalysis.valence_level / 10;

    // Score each track based on mood match
    const scoredTracks = tracks.map(track => {
      let score = 0;
      const f = track.audioFeatures;

      if (!f) return { ...track, moodScore: 0 };

      // Category match bonus
      if (track.moodCategory === targetCategory) {
        score += 50;
      }

      // Energy similarity
      const energyDiff = Math.abs(f.energy - energyLevel);
      score += (1 - energyDiff) * 20;

      // Valence similarity
      const valenceDiff = Math.abs(f.valence - valenceLevel);
      score += (1 - valenceDiff) * 20;

      // Danceability consideration
      if (moodAnalysis.music_characteristics?.danceability_preference === 'high' && f.danceability > 0.6) {
        score += 10;
      }

      return {
        ...track,
        moodScore: Math.round(score)
      };
    });

    // Sort by score
    scoredTracks.sort((a, b) => b.moodScore - a.moodScore);

    // Select tracks to fit duration
    const selected = [];
    let totalDuration = 0;
    const artistCount = {};
    const tolerance = 5 * 60 * 1000; // 5 minutes tolerance

    for (const track of scoredTracks) {
      if (track.moodScore < 30) continue; // Skip low-scoring tracks

      // Artist diversity check
      if (artistCount[track.artist] >= 2) continue;

      // Duration check
      if (totalDuration + track.duration_ms > targetDuration + tolerance) {
        continue;
      }

      selected.push({
        trackId: track.spotifyTrackId,
        name: track.name,
        artist: track.artist,
        album: track.album,
        albumImage: track.albumImage,
        duration_ms: track.duration_ms,
        previewUrl: track.previewUrl,
        externalUrl: track.externalUrl,
        moodScore: track.moodScore,
        reason: this.generateReason(track, targetCategory)
      });

      totalDuration += track.duration_ms;
      artistCount[track.artist] = (artistCount[track.artist] || 0) + 1;

      // Stop if we're close enough to target
      if (Math.abs(totalDuration - targetDuration) <= tolerance) {
        break;
      }
    }

    return {
      tracks: selected,
      totalDuration,
      trackCount: selected.length
    };
  }

  generateReason(track, targetCategory) {
    const f = track.audioFeatures;
    if (!f) return 'Matches your mood';

    const reasons = [];

    if (f.energy > 0.7) reasons.push('high energy');
    else if (f.energy < 0.3) reasons.push('calm and relaxing');

    if (f.valence > 0.7) reasons.push('uplifting vibes');
    else if (f.valence < 0.3) reasons.push('emotional depth');

    if (f.danceability > 0.7) reasons.push('great beat');
    if (f.acousticness > 0.6) reasons.push('acoustic feel');

    if (track.moodCategory === targetCategory) {
      reasons.push(`perfect for ${targetCategory.replace('_', ' ')} mood`);
    }

    return reasons.length > 0 ? reasons.slice(0, 2).join(', ') : 'Matches your mood';
  }
}

module.exports = new MLService();
