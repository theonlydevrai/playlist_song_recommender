const axios = require('axios');
const geminiService = require('./geminiService');

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
      return this.ruleBasedRecommendations(tracks, moodAnalysis, targetDuration);
    }
  }

  async ruleBasedRecommendations(tracks, moodAnalysis, targetDuration, userMoodDescription = '') {
    const targetCategory = moodAnalysis.mood_category;
    const similarMoods = moodAnalysis.similar_moods || this.getSimilarMoods(targetCategory);
    const energyLevel = moodAnalysis.energy_level / 10;
    const valenceLevel = moodAnalysis.valence_level / 10;

    console.log(`Target mood: ${targetCategory}, similar: ${similarMoods.join(', ')}`);
    console.log(`Target energy: ${energyLevel}, valence: ${valenceLevel}`);
    console.log(`Target duration: ${targetDuration}ms (${Math.round(targetDuration/60000)} min)`);

    // Try to get Gemini-based track rankings for better personalization
    let geminiScores = null;
    if (userMoodDescription && tracks.length > 0) {
      try {
        // Pass all tracks - geminiService will randomly sample from entire playlist
        geminiScores = await geminiService.analyzeAndRankTracks(
          tracks, 
          moodAnalysis, 
          userMoodDescription
        );
      } catch (e) {
        console.log('Gemini ranking unavailable, using rule-based scoring');
      }
    }

    // Score each track based on mood match
    const scoredTracks = tracks.map((track, index) => {
      let score = 0;
      const f = track.audioFeatures || {};

      // Use Gemini score if available (keyed by track ID)
      if (geminiScores && geminiScores[track.spotifyTrackId]) {
        score = geminiScores[track.spotifyTrackId].score;
        track.geminiReason = geminiScores[track.spotifyTrackId].reason;
      } else {
        // Rule-based scoring

        // Primary category match (highest weight)
        if (track.moodCategory === targetCategory) {
          score += 40;
        }
        // Similar mood category match
        else if (similarMoods.includes(track.moodCategory)) {
          score += 25;
        }

        // Energy similarity (0-25 points)
        const trackEnergy = f.energy ?? 0.5;
        const energyDiff = Math.abs(trackEnergy - energyLevel);
        score += Math.round((1 - energyDiff) * 25);

        // Valence similarity (0-25 points)
        const trackValence = f.valence ?? 0.5;
        const valenceDiff = Math.abs(trackValence - valenceLevel);
        score += Math.round((1 - valenceDiff) * 25);

        // Danceability bonus for party/dance moods
        if (['party_dance', 'happy_energetic'].includes(targetCategory)) {
          const trackDanceability = f.danceability ?? 0.5;
          if (trackDanceability > 0.6) {
            score += 10;
          }
        }

        // Acousticness bonus for calm/romantic moods
        if (['calm_peaceful', 'romantic', 'melancholic'].includes(targetCategory)) {
          const trackAcousticness = f.acousticness ?? 0.5;
          if (trackAcousticness > 0.4) {
            score += 10;
          }
        }

        // Instrumentalness bonus for ambient/focus moods
        if (['chill_ambient', 'motivational'].includes(targetCategory)) {
          const trackInstrumentalness = f.instrumentalness ?? 0;
          if (trackInstrumentalness > 0.3) {
            score += 5;
          }
        }
      }

      return {
        ...track,
        moodScore: Math.min(100, Math.max(0, Math.round(score)))
      };
    });

    // Sort by score (highest first)
    scoredTracks.sort((a, b) => b.moodScore - a.moodScore);

    // Select tracks with smart duration fitting
    const selected = [];
    let totalDuration = 0;
    const artistCount = {};
    const tolerance = 3 * 60 * 1000; // 3 minutes tolerance
    const minScore = 30; // Minimum score threshold

    // First pass: high-scoring tracks
    for (const track of scoredTracks) {
      if (totalDuration >= targetDuration) break;
      if (track.moodScore < minScore) continue;

      // Artist diversity (max 2 songs per artist for variety)
      const artistKey = (track.artist || 'unknown').toLowerCase();
      if (artistCount[artistKey] >= 2) continue;

      const trackDuration = track.duration_ms || 210000;

      // Don't go too far over target
      if (totalDuration + trackDuration > targetDuration + tolerance && selected.length >= 3) {
        continue;
      }

      selected.push(this.formatTrackForResponse(track, targetCategory));
      totalDuration += trackDuration;
      artistCount[artistKey] = (artistCount[artistKey] || 0) + 1;
    }

    // Second pass: fill remaining duration if needed
    if (totalDuration < targetDuration * 0.7 && selected.length < scoredTracks.length) {
      console.log(`Filling playlist: ${Math.round(totalDuration/60000)}min < ${Math.round(targetDuration*0.7/60000)}min needed`);
      
      for (const track of scoredTracks) {
        if (totalDuration >= targetDuration) break;
        if (selected.find(s => s.trackId === track.spotifyTrackId)) continue;

        const artistKey = (track.artist || 'unknown').toLowerCase();
        if (artistCount[artistKey] >= 3) continue;

        const trackDuration = track.duration_ms || 210000;
        
        selected.push(this.formatTrackForResponse(track, targetCategory, true));
        totalDuration += trackDuration;
        artistCount[artistKey] = (artistCount[artistKey] || 0) + 1;
      }
    }

    // Shuffle middle tracks slightly for variety (keep top 3 and bottom 3 in place)
    if (selected.length > 8) {
      const top = selected.slice(0, 3);
      const middle = selected.slice(3, -3);
      const bottom = selected.slice(-3);
      
      // Light shuffle of middle section
      for (let i = middle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [middle[i], middle[j]] = [middle[j], middle[i]];
      }
      
      selected.splice(0, selected.length, ...top, ...middle, ...bottom);
    }

    console.log(`Selected ${selected.length} tracks, total duration: ${Math.round(totalDuration/60000)} min`);

    return {
      tracks: selected,
      totalDuration: totalDuration || 0,
      trackCount: selected.length
    };
  }

  formatTrackForResponse(track, targetCategory, isFiller = false) {
    return {
      trackId: track.spotifyTrackId,
      name: track.name || 'Unknown Track',
      artist: track.artist || 'Unknown Artist',
      album: track.album || 'Unknown Album',
      albumImage: track.albumImage,
      duration_ms: track.duration_ms || 210000,
      previewUrl: track.previewUrl,
      externalUrl: track.externalUrl,
      moodScore: track.moodScore,
      reason: isFiller ? 'Added for variety' : (track.geminiReason || this.generateReason(track, targetCategory))
    };
  }

  getSimilarMoods(category) {
    const similarityMap = {
      happy_energetic: ['party_dance', 'motivational'],
      calm_peaceful: ['chill_ambient', 'romantic'],
      melancholic: ['romantic', 'calm_peaceful'],
      party_dance: ['happy_energetic', 'motivational'],
      romantic: ['calm_peaceful', 'melancholic'],
      motivational: ['happy_energetic', 'intense_aggressive'],
      chill_ambient: ['calm_peaceful', 'melancholic'],
      intense_aggressive: ['motivational', 'party_dance']
    };
    return similarityMap[category] || ['calm_peaceful'];
  }

  generateReason(track, targetCategory) {
    const f = track.audioFeatures;
    if (!f) return 'Matches your mood';

    const reasons = [];

    // Energy-based reasons
    if (f.energy > 0.75) reasons.push('high energy');
    else if (f.energy > 0.5) reasons.push('moderate energy');
    else if (f.energy < 0.3) reasons.push('calm and soothing');

    // Valence-based reasons
    if (f.valence > 0.75) reasons.push('uplifting vibes');
    else if (f.valence > 0.5) reasons.push('positive tone');
    else if (f.valence < 0.3) reasons.push('emotional depth');

    // Feature-specific reasons
    if (f.danceability > 0.7) reasons.push('great rhythm');
    if (f.acousticness > 0.6) reasons.push('acoustic warmth');
    if (f.instrumentalness > 0.5) reasons.push('instrumental focus');

    // Category match
    if (track.moodCategory === targetCategory) {
      const categoryNames = {
        happy_energetic: 'upbeat',
        calm_peaceful: 'peaceful',
        melancholic: 'reflective',
        party_dance: 'party-ready',
        romantic: 'romantic',
        motivational: 'motivating',
        chill_ambient: 'ambient',
        intense_aggressive: 'intense'
      };
      reasons.push(`${categoryNames[targetCategory] || 'matching'} mood`);
    }

    return reasons.length > 0 ? reasons.slice(0, 2).join(', ') : 'Fits your vibe';
  }
}

module.exports = new MLService();
