const axios = require("axios");

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
  }

  async analyzeMood(moodDescription) {
    const systemPrompt = `You are an expert music psychologist and DJ with deep understanding of how music affects emotions. Your task is to analyze a user's mood description and translate it into precise musical parameters.

CONTEXT: You're helping create a personalized playlist. The user has shared their current emotional state, activity, or desired atmosphere. You need to understand the nuances of their request.

ANALYSIS GUIDELINES:
1. Consider both explicit emotions AND implicit context (e.g., "studying" implies need for focus, low lyrics)
2. Detect activity context: working out, studying, relaxing, socializing, commuting, sleeping
3. Consider time-of-day implications if mentioned
4. Understand compound moods (e.g., "happy but tired" = medium energy, high valence)
5. Recognize genre preferences hinted in the description

MUSICAL PARAMETERS TO DETERMINE:
- Energy (1-10): Physical intensity and activity level of music
- Valence (1-10): Emotional positivity (1=dark/sad, 10=bright/happy)
- Tempo preference: slow (<90 BPM), medium (90-120 BPM), fast (>120 BPM)
- Complexity: simple/repetitive vs complex/varied
- Vocal preference: instrumental, background vocals, prominent vocals
- Acoustic vs Electronic preference

MOOD CATEGORIES (choose the best fit):
- happy_energetic: Upbeat, joyful, celebratory
- calm_peaceful: Serene, tranquil, meditative
- melancholic: Sad, reflective, nostalgic, bittersweet
- party_dance: High-energy, danceable, social
- romantic: Intimate, tender, passionate
- motivational: Empowering, determined, focused
- chill_ambient: Relaxed, atmospheric, background
- intense_aggressive: Powerful, angry, cathartic

IMPORTANT: Respond ONLY with valid JSON, no markdown, no explanation.`;

    const userPrompt = `Analyze this mood/context for music selection: "${moodDescription}"

Provide your analysis in this exact JSON format:
{
  "emotions": ["primary_emotion", "secondary_emotion"],
  "detected_context": "activity or situation detected",
  "energy_level": 7,
  "valence_level": 8,
  "intensity": 6,
  "tempo_preference": "medium",
  "vocal_preference": "background",
  "acoustic_electronic_balance": 0.5,
  "music_characteristics": {
    "tempo_preference": "medium",
    "energy_preference": "medium-high",
    "danceability_preference": "medium",
    "acousticness_preference": "low",
    "instrumentalness_preference": "low",
    "complexity_preference": "medium"
  },
  "mood_category": "happy_energetic",
  "similar_moods": ["motivational", "party_dance"],
  "avoid_characteristics": ["very slow", "sad lyrics"],
  "confidence": 0.85,
  "interpretation": "Brief explanation of how you interpreted the mood"
}`;

    try {
      const response = await axios.post(
        `${GEMINI_API_URL}?key=${this.apiKey}`,
        {
          contents: [
            {
              parts: [{ text: systemPrompt + "\n\n" + userPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 1024,
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const textResponse = response.data.candidates[0].content.parts[0].text;
      let cleanedResponse = this.cleanJsonResponse(textResponse);
      return JSON.parse(cleanedResponse);
    } catch (error) {
      console.error("Gemini API error:", error.response?.data || error.message);
      return this.getDefaultMoodAnalysis(moodDescription);
    }
  }

  async analyzeAndRankTracks(tracks, moodAnalysis, userMoodDescription) {
    const sampleSize = Math.min(tracks.length, 50);
    const sample = tracks.slice(0, sampleSize);

    const trackList = sample
      .map((t, i) => `${i + 1}. "${t.name}" by ${t.artist}`)
      .join("\n");

    const prompt = `You are a music curator creating a personalized playlist.

USER'S MOOD: "${userMoodDescription}"
DETECTED MOOD CATEGORY: ${moodAnalysis.mood_category}
TARGET ENERGY: ${moodAnalysis.energy_level}/10
TARGET VALENCE: ${moodAnalysis.valence_level}/10

AVAILABLE TRACKS:
${trackList}

Your task: Score each track from 0-100 based on how well it matches the user's mood.

SCORING CRITERIA:
- 90-100: Perfect match - song embodies the exact mood/vibe
- 70-89: Great match - strong alignment with mood
- 50-69: Decent match - some elements fit
- 30-49: Weak match - only minor alignment
- 0-29: Poor match - conflicts with desired mood

Consider:
1. Song title and artist style/genre
2. Known emotional associations with the artist
3. Typical energy and mood of the artist's music
4. How well the track name suggests mood alignment

Respond ONLY with a JSON array of objects with track index and score:
[{"index": 1, "score": 85, "reason": "brief reason"}, ...]`;

    try {
      const response = await axios.post(
        `${GEMINI_API_URL}?key=${this.apiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            topP: 0.9,
            maxOutputTokens: 4096,
          },
        },
        { headers: { "Content-Type": "application/json" } }
      );

      let textResponse = this.cleanJsonResponse(
        response.data.candidates[0].content.parts[0].text
      );

      const rankings = JSON.parse(textResponse);
      
      // Create a map of index to score
      const scoreMap = {};
      for (const item of rankings) {
        scoreMap[item.index] = {
          score: item.score || 50,
          reason: item.reason || "Matches mood"
        };
      }

      return scoreMap;
    } catch (error) {
      console.error("Gemini track ranking error:", error.message);
      return null;
    }
  }

  async analyzeTracksMood(tracks) {
    const sampleSize = Math.min(tracks.length, 30);
    const sample = tracks.slice(0, sampleSize);

    const trackList = sample
      .map((t) => `"${t.name}" by ${t.artist}`)
      .join("\n");

    const prompt = `You are a music expert with encyclopedic knowledge of songs and artists. Analyze these songs and estimate their emotional characteristics based on your knowledge of the music.

Songs to analyze:
${trackList}

For EACH song, provide your best estimate of:
- energy (0.0-1.0): Physical intensity (0=very calm, 1=very energetic)
- valence (0.0-1.0): Emotional tone (0=sad/dark, 1=happy/bright)
- danceability (0.0-1.0): Rhythm suitability for dancing
- category: Best fitting mood category

Categories: happy_energetic, calm_peaceful, melancholic, party_dance, romantic, motivational, chill_ambient, intense_aggressive

Base your analysis on:
1. Artist's typical style and genre
2. Song title implications
3. Known characteristics of the song if you recognize it
4. Genre conventions

Respond ONLY with a JSON array:
[{"name": "exact song name", "energy": 0.7, "valence": 0.8, "danceability": 0.6, "category": "happy_energetic"}, ...]`;

    try {
      const response = await axios.post(
        `${GEMINI_API_URL}?key=${this.apiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            topP: 0.9,
            maxOutputTokens: 4096,
          },
        },
        { headers: { "Content-Type": "application/json" } }
      );

      let textResponse = this.cleanJsonResponse(
        response.data.candidates[0].content.parts[0].text
      );

      const analysis = JSON.parse(textResponse);

      const trackMoodMap = {};
      for (const item of analysis) {
        trackMoodMap[item.name.toLowerCase()] = {
          energy: item.energy || 0.5,
          valence: item.valence || 0.5,
          danceability: item.danceability || 0.5,
          category: item.category || "calm_peaceful",
        };
      }

      return trackMoodMap;
    } catch (error) {
      console.error("Gemini track analysis error:", error.message);
      return null;
    }
  }

  cleanJsonResponse(text) {
    let cleaned = text.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.slice(7);
    }
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.slice(0, -3);
    }
    return cleaned.trim();
  }

  getDefaultMoodAnalysis(moodDescription) {
    const lowerMood = moodDescription.toLowerCase();

    const moodKeywords = {
      happy_energetic: ["happy", "excited", "joy", "celebrate", "pumped", "great", "amazing", "awesome", "fantastic"],
      calm_peaceful: ["calm", "peaceful", "relax", "chill", "unwind", "serene", "tranquil", "zen", "meditate"],
      melancholic: ["sad", "down", "depressed", "lonely", "miss", "heartbreak", "breakup", "cry", "grief", "nostalgic"],
      party_dance: ["party", "dance", "club", "fun", "weekend", "celebrate", "groove", "night out"],
      romantic: ["love", "romantic", "crush", "date", "tender", "intimate", "passion", "sensual"],
      motivational: ["motivated", "workout", "gym", "run", "focus", "work", "study", "productive", "grind", "hustle"],
      chill_ambient: ["background", "ambient", "sleep", "rest", "quiet", "lo-fi", "lofi", "concentrate"],
      intense_aggressive: ["angry", "rage", "intense", "heavy", "frustrated", "metal", "hard", "aggressive"],
    };

    let detectedCategory = "calm_peaceful";
    let maxMatches = 0;

    for (const [category, keywords] of Object.entries(moodKeywords)) {
      const matches = keywords.filter((kw) => lowerMood.includes(kw)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedCategory = category;
      }
    }

    const categoryDefaults = {
      happy_energetic: { energy: 8, valence: 9, tempo: "fast", danceability: "high" },
      calm_peaceful: { energy: 3, valence: 6, tempo: "slow", danceability: "low" },
      melancholic: { energy: 3, valence: 2, tempo: "slow", danceability: "low" },
      party_dance: { energy: 9, valence: 8, tempo: "fast", danceability: "high" },
      romantic: { energy: 4, valence: 7, tempo: "slow", danceability: "low" },
      motivational: { energy: 8, valence: 7, tempo: "fast", danceability: "medium" },
      chill_ambient: { energy: 2, valence: 5, tempo: "slow", danceability: "low" },
      intense_aggressive: { energy: 9, valence: 3, tempo: "fast", danceability: "medium" },
    };

    const defaults = categoryDefaults[detectedCategory];

    return {
      emotions: [detectedCategory.replace("_", " ")],
      detected_context: moodDescription,
      energy_level: defaults.energy,
      valence_level: defaults.valence,
      intensity: Math.round((defaults.energy + (10 - defaults.valence)) / 2),
      tempo_preference: defaults.tempo,
      music_characteristics: {
        tempo_preference: defaults.tempo,
        energy_preference: defaults.energy > 6 ? "high" : "low",
        danceability_preference: defaults.danceability,
        acousticness_preference: defaults.energy < 5 ? "high" : "low",
        instrumentalness_preference: detectedCategory === "chill_ambient" ? "high" : "low",
      },
      mood_category: detectedCategory,
      similar_moods: this.getSimilarMoods(detectedCategory),
      confidence: 0.5,
      interpretation: `Detected ${detectedCategory.replace("_", " ")} mood from keywords`,
    };
  }

  getSimilarMoods(category) {
    const similarityMap = {
      happy_energetic: ["party_dance", "motivational"],
      calm_peaceful: ["chill_ambient", "romantic"],
      melancholic: ["romantic", "calm_peaceful"],
      party_dance: ["happy_energetic", "motivational"],
      romantic: ["calm_peaceful", "melancholic"],
      motivational: ["happy_energetic", "intense_aggressive"],
      chill_ambient: ["calm_peaceful", "melancholic"],
      intense_aggressive: ["motivational", "party_dance"],
    };
    return similarityMap[category] || ["calm_peaceful"];
  }

  async generatePlaylistDescription(moodInput, trackCount, totalDuration) {
    try {
      const response = await axios.post(
        `${GEMINI_API_URL}?key=${this.apiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: `Generate a short, creative playlist description (max 100 characters) for a mood-based playlist. 
                  Mood: "${moodInput}"
                  Tracks: ${trackCount}
                  Duration: ${Math.round(totalDuration / 60000)} minutes
                  
                  Respond with ONLY the description text, no quotes.`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 100,
          },
        }
      );

      return response.data.candidates[0].content.parts[0].text.trim();
    } catch (error) {
      return `Mood playlist: ${moodInput.slice(0, 50)}`;
    }
  }
}

module.exports = new GeminiService();
