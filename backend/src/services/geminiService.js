const axios = require('axios');

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
  }

  async analyzeMood(moodDescription) {
    const systemPrompt = `You are a music emotion expert. Analyze the user's mood description and map it to musical characteristics.

For any mood input, provide:
1. Primary emotions (1-3 emotions)
2. Energy level (1-10 scale)
3. Valence level (1-10 scale, 1=very negative, 10=very positive)
4. Preferred music characteristics
5. A mood category from: happy_energetic, calm_peaceful, melancholic, party_dance, romantic, motivational, chill_ambient, intense_aggressive

IMPORTANT: Respond ONLY with valid JSON, no markdown, no explanation.`;

    const userPrompt = `User mood: "${moodDescription}"

Analyze this mood and provide musical recommendations in this exact JSON format:
{
  "emotions": ["emotion1", "emotion2"],
  "energy_level": 5,
  "valence_level": 7,
  "intensity": 5,
  "context": "brief context description",
  "music_characteristics": {
    "tempo_preference": "medium",
    "energy_preference": "medium-high",
    "danceability_preference": "medium",
    "acousticness_preference": "low"
  },
  "mood_category": "happy_energetic",
  "confidence": 0.85
}`;

    try {
      const response = await axios.post(
        `${GEMINI_API_URL}?key=${this.apiKey}`,
        {
          contents: [
            {
              parts: [
                { text: systemPrompt + '\n\n' + userPrompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const textResponse = response.data.candidates[0].content.parts[0].text;
      
      // Clean the response - remove markdown code blocks if present
      let cleanedResponse = textResponse.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.slice(7);
      }
      if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.slice(3);
      }
      if (cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(0, -3);
      }
      cleanedResponse = cleanedResponse.trim();

      return JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('Gemini API error:', error.response?.data || error.message);
      // Return a default analysis if Gemini fails
      return this.getDefaultMoodAnalysis(moodDescription);
    }
  }

  getDefaultMoodAnalysis(moodDescription) {
    // Simple keyword-based fallback
    const lowerMood = moodDescription.toLowerCase();
    
    const moodKeywords = {
      happy_energetic: ['happy', 'excited', 'joy', 'celebrate', 'pumped', 'great'],
      calm_peaceful: ['calm', 'peaceful', 'relax', 'chill', 'unwind', 'serene'],
      melancholic: ['sad', 'down', 'depressed', 'lonely', 'miss', 'heartbreak', 'breakup'],
      party_dance: ['party', 'dance', 'club', 'fun', 'weekend'],
      romantic: ['love', 'romantic', 'crush', 'date', 'tender'],
      motivational: ['motivated', 'workout', 'gym', 'run', 'focus', 'work', 'study'],
      chill_ambient: ['background', 'ambient', 'sleep', 'rest', 'quiet'],
      intense_aggressive: ['angry', 'rage', 'intense', 'heavy', 'frustrated']
    };

    let detectedCategory = 'calm_peaceful';
    let maxMatches = 0;

    for (const [category, keywords] of Object.entries(moodKeywords)) {
      const matches = keywords.filter(kw => lowerMood.includes(kw)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedCategory = category;
      }
    }

    const categoryDefaults = {
      happy_energetic: { energy: 8, valence: 9 },
      calm_peaceful: { energy: 3, valence: 6 },
      melancholic: { energy: 3, valence: 2 },
      party_dance: { energy: 9, valence: 8 },
      romantic: { energy: 4, valence: 7 },
      motivational: { energy: 8, valence: 7 },
      chill_ambient: { energy: 2, valence: 5 },
      intense_aggressive: { energy: 9, valence: 3 }
    };

    const defaults = categoryDefaults[detectedCategory];

    return {
      emotions: [detectedCategory.replace('_', ' ')],
      energy_level: defaults.energy,
      valence_level: defaults.valence,
      intensity: 5,
      context: moodDescription,
      music_characteristics: {
        tempo_preference: defaults.energy > 6 ? 'fast' : 'slow',
        energy_preference: defaults.energy > 6 ? 'high' : 'low',
        danceability_preference: defaults.energy > 6 ? 'high' : 'low',
        acousticness_preference: defaults.energy < 5 ? 'high' : 'low'
      },
      mood_category: detectedCategory,
      confidence: 0.5
    };
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
                  
                  Respond with ONLY the description text, no quotes.`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 100
          }
        }
      );

      return response.data.candidates[0].content.parts[0].text.trim();
    } catch (error) {
      return `Mood playlist: ${moodInput.slice(0, 50)}`;
    }
  }
}

module.exports = new GeminiService();
