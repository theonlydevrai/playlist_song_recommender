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

      let category = track.moodCategory;

      if (!category) {
        // Fallback to rule-based if no AI category set
        category = 'calm_peaceful';

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
      }

      // Ensure category exists in our map (fallback to calm_peaceful if AI returned something wild)
      if (!categories[category]) category = 'calm_peaceful';

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

  async ruleBasedRecommendations(tracks, moodAnalysis, targetDuration, userMoodDescription = '', selectedTrackIds = []) {
    const targetCategory = moodAnalysis.mood_category;
    const similarMoods = moodAnalysis.similar_moods || this.getSimilarMoods(targetCategory);
    let energyLevel = moodAnalysis.energy_level / 10;
    let valenceLevel = moodAnalysis.valence_level / 10;

    // Filter mandatory tracks
    const mandatoryTracks = [];
    const candidateTracks = [];
    
    // Feature averages for selected tracks
    let selectedEnergy = 0;
    let selectedValence = 0;
    let selectedCount = 0;

    for (const track of tracks) {
      if (selectedTrackIds.includes(track.spotifyTrackId)) {
        mandatoryTracks.push(track);
        if (track.audioFeatures) {
           selectedEnergy += track.audioFeatures.energy || 0.5;
           selectedValence += track.audioFeatures.valence || 0.5;
           selectedCount++;
        }
      } else {
        candidateTracks.push(track);
      }
    }

    // If user selected tracks, adjust targets to blend mood with selected taste
    if (selectedCount > 0) {
       const avgEnergy = selectedEnergy / selectedCount;
       const avgValence = selectedValence / selectedCount;
       
       console.log(`Adjusting targets based on ${selectedCount} selected songs.`);
       console.log(`Original E:${energyLevel.toFixed(2)} V:${valenceLevel.toFixed(2)}`);
       console.log(`Selected E:${avgEnergy.toFixed(2)} V:${avgValence.toFixed(2)}`);
       
       // Blend: 60% mood, 40% selected songs (to keep it "based around the same taste")
       energyLevel = (energyLevel * 0.6) + (avgEnergy * 0.4);
       valenceLevel = (valenceLevel * 0.6) + (avgValence * 0.4);
    }

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

    // Score each candidate track based on mood match
    const scoredTracks = candidateTracks.map((track, index) => {
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

        // Similarity to selected tracks bonus
        if (selectedCount > 0) {
           // Simple distance check from average of selected tracks
           const avgEnergy = selectedEnergy / selectedCount;
           const avgValence = selectedValence / selectedCount;
           const dist = Math.abs(trackEnergy - avgEnergy) + Math.abs(trackValence - avgValence);
           // Boost up to 15 points for being very close
           if (dist < 0.3) score += 15;
           else if (dist < 0.6) score += 8;
        }

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
    
    // 1. Add Mandatory Tracks First
    for (const track of mandatoryTracks) {
       selected.push(this.formatTrackForResponse({
         ...track,
         moodScore: 100 // Force max score for selected tracks
       }, targetCategory));
       totalDuration += (track.duration_ms || 210000);
    }
    
    const artistCount = {};
    const tolerance = 3 * 60 * 1000; // 3 minutes tolerance
    const minScore = 30; // Minimum score threshold

    // Update artist counts for mandatory tracks
    mandatoryTracks.forEach(t => {
       const artistKey = (t.artist || 'unknown').toLowerCase();
       artistCount[artistKey] = (artistCount[artistKey] || 0) + 1;
    });

    // First pass: high-scoring tracks
    for (const track of scoredTracks) {
      if (totalDuration >= targetDuration) break;
      if (track.moodScore < minScore) continue;

      // Artist diversity (max 2 songs per artist for variety)
      const artistKey = (track.artist || 'unknown').toLowerCase();
      // Allow slightly more if user explicitly selected this artist
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
    if (totalDuration < targetDuration * 0.7 && selected.length < (scoredTracks.length + mandatoryTracks.length)) {
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

    // Shuffle ONLY the non-mandatory tracks slightly? 
    // Or just keep the general shuffle logic but keep mandatory at top?
    // User probably wants mandatory tracks to be part of the flow, not just stuck at top.
    
    // Logic: Keep top 3 (likely best matches or mandatory) at top, shuffle middle.
    // If mandatory tracks are less than 3, they will stay at top.
    
    if (selected.length > 8) {
      // Find indices of mandatory tracks to try and preserve their relative position or keep them near top?
      // For now, let's just shuffle the middle section as before, 
      // but if we want mandatory tracks to be distributed, we might want a full shuffle.
      // However, usually "Seed" tracks are good openers. Let's keep existing logic.
      
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

  async moodTransitionRecommendations(tracks, moodTransitionAnalysis, targetDuration, moodSequence, selectedTrackIds = []) {
    const { trackAnalysis } = moodTransitionAnalysis;
    
    console.log(`Building mood transition playlist: ${moodSequence.join(' → ')}`);
    console.log(`Target duration: ${Math.round(targetDuration / 60000)} minutes`);
    console.log(`Selected seed tracks: ${selectedTrackIds.length}`);

    // Map track analysis by index
    const analysisMap = new Map();
    trackAnalysis.forEach(ta => {
      analysisMap.set(ta.trackIndex, ta);
    });

    // Enrich tracks with transition analysis
    const enrichedTracks = tracks.map((track, index) => {
      const analysis = analysisMap.get(index) || {
        mood_matches: [moodSequence[0]],
        bridge_potential: 50,
        segment_placement: index / tracks.length,
        transition_quality: 'moderate'
      };
      
      return {
        ...track,
        moodMatches: analysis.mood_matches || [],
        bridgePotential: analysis.bridge_potential || 50,
        segmentPlacement: analysis.segment_placement || 0,
        transitionQuality: analysis.transition_quality || 'moderate'
      };
    });

    // Identify mandatory tracks
    const mandatoryTracks = enrichedTracks.filter(t => 
      selectedTrackIds.includes(t.spotifyTrackId)
    );

    // Calculate segment sizes (natural flow, AI-suggested distribution)
    const segments = this.calculateSegmentSizes(moodSequence, targetDuration, mandatoryTracks);
    
    console.log('Segment distribution:', segments.map(s => `${s.mood}: ${Math.round(s.duration / 60000)}m`).join(', '));

    // Build playlist by segments
    const selected = [];
    let totalDuration = 0;
    const usedTrackIds = new Set();
    const artistCount = {};

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const isLastSegment = i === segments.length - 1;
      const nextMood = isLastSegment ? null : segments[i + 1].mood;
      
      console.log(`\nBuilding segment ${i + 1}: ${segment.mood} (target: ${Math.round(segment.duration / 60000)}m)`);

      // Get tracks for this segment
      const segmentTracks = this.getTracksForSegment(
        enrichedTracks,
        segment.mood,
        nextMood,
        usedTrackIds,
        artistCount,
        mandatoryTracks.filter(mt => mt.moodMatches.includes(segment.mood))
      );

      // Add tracks until segment duration is reached
      let segmentDuration = 0;
      const segmentSelected = [];

      for (const track of segmentTracks) {
        if (usedTrackIds.has(track.spotifyTrackId)) continue;
        if (segmentDuration >= segment.duration && segmentSelected.length >= 3) break;

        // Artist diversity check
        const artistKey = (track.artist || 'unknown').toLowerCase();
        if ((artistCount[artistKey] || 0) >= 3) continue;

        segmentSelected.push(track);
        usedTrackIds.add(track.spotifyTrackId);
        segmentDuration += (track.duration_ms || 210000);
        artistCount[artistKey] = (artistCount[artistKey] || 0) + 1;
      }

      console.log(`  Added ${segmentSelected.length} tracks (${Math.round(segmentDuration / 60000)}m)`);

      // Format and add to final playlist
      segmentSelected.forEach(track => {
        selected.push(this.formatTransitionTrack(track, segment.mood, i));
        totalDuration += (track.duration_ms || 210000);
      });

      segment.trackCount = segmentSelected.length;
      segment.actualDuration = segmentDuration;
    }

    console.log(`\nFinal playlist: ${selected.length} tracks, ${Math.round(totalDuration / 60000)} minutes`);

    return {
      tracks: selected,
      segments: segments.map(s => ({
        mood: s.mood,
        targetDuration: s.duration,
        actualDuration: s.actualDuration,
        trackCount: s.trackCount
      })),
      totalDuration,
      trackCount: selected.length
    };
  }

  calculateSegmentSizes(moodSequence, totalDuration, mandatoryTracks) {
    const numSegments = moodSequence.length;
    
    // AI-suggested distribution with gradual transitions
    // Early moods get slightly more time for establishment
    const weights = moodSequence.map((mood, i) => {
      if (i === 0) return 1.2; // Opening mood gets more time
      if (i === numSegments - 1) return 1.3; // Closing mood gets most time
      return 1.0; // Middle moods equal weight
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    
    return moodSequence.map((mood, i) => ({
      mood,
      duration: Math.round((weights[i] / totalWeight) * totalDuration),
      index: i
    }));
  }

  getTracksForSegment(allTracks, currentMood, nextMood, usedTrackIds, artistCount, mandatoryForSegment) {
    const segmentTracks = [];

    // 1. Add mandatory tracks for this segment first
    mandatoryForSegment.forEach(track => {
      if (!usedTrackIds.has(track.spotifyTrackId)) {
        segmentTracks.push({
          ...track,
          segmentScore: 100,
          isMandatory: true
        });
      }
    });

    // 2. Score all available tracks for this segment
    const availableTracks = allTracks
      .filter(t => !usedTrackIds.has(t.spotifyTrackId))
      .map(track => {
        let score = 0;

        // Mood match score (primary)
        const matchesCurrentMood = (track.moodMatches || []).includes(currentMood);
        const matchesNextMood = nextMood && (track.moodMatches || []).includes(nextMood);

        if (matchesCurrentMood) score += 60;
        if (matchesNextMood) score += 20; // Bridge potential
        if (matchesCurrentMood && matchesNextMood) score += 20; // Perfect bridge

        // Bridge potential bonus
        score += (track.bridgePotential || 50) * 0.2;

        // Audio feature matching
        const f = track.audioFeatures;
        if (f) {
          const moodTargets = this.getMoodTargets(currentMood);
          const energyDiff = Math.abs(f.energy - moodTargets.energy);
          const valenceDiff = Math.abs(f.valence - moodTargets.valence);
          score -= (energyDiff + valenceDiff) * 15;
        }

        // Transition quality bonus
        if (track.transitionQuality === 'smooth') score += 10;
        else if (track.transitionQuality === 'abrupt') score -= 10;

        return {
          ...track,
          segmentScore: Math.max(0, Math.round(score))
        };
      });

    // Sort by score
    availableTracks.sort((a, b) => b.segmentScore - a.segmentScore);

    // Add scored tracks to segment
    segmentTracks.push(...availableTracks);

    return segmentTracks;
  }

  getMoodTargets(mood) {
    const targets = {
      melancholic: { energy: 0.4, valence: 0.3 },
      romantic: { energy: 0.5, valence: 0.6 },
      vibrant: { energy: 0.75, valence: 0.8 },
      party: { energy: 0.85, valence: 0.75 },
      happy_energetic: { energy: 0.8, valence: 0.8 },
      calm_peaceful: { energy: 0.3, valence: 0.6 },
      party_dance: { energy: 0.85, valence: 0.75 },
      motivational: { energy: 0.75, valence: 0.7 },
      chill_ambient: { energy: 0.25, valence: 0.5 },
      intense_aggressive: { energy: 0.9, valence: 0.4 },
      euphoric: { energy: 0.85, valence: 0.9 }
    };

    return targets[mood] || { energy: 0.5, valence: 0.5 };
  }

  formatTransitionTrack(track, segmentMood, segmentIndex) {
    return {
      trackId: track.spotifyTrackId,
      name: track.name || 'Unknown Track',
      artist: track.artist || 'Unknown Artist',
      album: track.album || 'Unknown Album',
      albumImage: track.albumImage,
      duration_ms: track.duration_ms || 210000,
      previewUrl: track.previewUrl,
      externalUrl: track.externalUrl,
      segmentMood: segmentMood,
      segmentIndex: segmentIndex,
      moodScore: track.segmentScore || 50,
      bridgePotential: track.bridgePotential || 0,
      isMandatory: track.isMandatory || false,
      reason: track.isMandatory 
        ? 'Your selected track' 
        : `Fits ${segmentMood} mood${track.bridgePotential > 70 ? ', smooth transition' : ''}`
    };
  }
}

module.exports = new MLService();
