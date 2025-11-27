import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { ArrowLeft, Music, Clock, Sparkles, Loader2, Send } from 'lucide-react'

const MOOD_CATEGORIES = {
  happy_energetic: { label: 'Happy & Energetic', emoji: '😊' },
  calm_peaceful: { label: 'Calm & Peaceful', emoji: '😌' },
  melancholic: { label: 'Melancholic', emoji: '😢' },
  party_dance: { label: 'Party & Dance', emoji: '🎉' },
  romantic: { label: 'Romantic', emoji: '💕' },
  motivational: { label: 'Motivational', emoji: '💪' },
  chill_ambient: { label: 'Chill & Ambient', emoji: '🌙' },
  intense_aggressive: { label: 'Intense', emoji: '🔥' }
}

const DURATION_PRESETS = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 hour', value: 60 },
  { label: '1.5 hours', value: 90 },
  { label: '2 hours', value: 120 }
]

export default function Playlist() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [playlist, setPlaylist] = useState(null)
  const [loading, setLoading] = useState(true)
  const [moodInput, setMoodInput] = useState('')
  const [duration, setDuration] = useState(30)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPlaylist()
  }, [id])

  const fetchPlaylist = async () => {
    try {
      const response = await axios.get(`/api/playlists/${id}`, { withCredentials: true })
      setPlaylist(response.data)
    } catch (err) {
      console.error('Failed to fetch playlist:', err)
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const generateRecommendations = async (e) => {
    e.preventDefault()
    if (!moodInput.trim()) return

    setGenerating(true)
    setError('')

    try {
      const response = await axios.post('/api/recommendations', {
        playlistId: id,
        moodDescription: moodInput,
        durationMinutes: duration
      }, { withCredentials: true })

      navigate(`/recommendations/${response.data.sessionId}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate recommendations')
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-spotify-green animate-spin" />
      </div>
    )
  }

  if (!playlist) return null

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Dashboard
      </button>

      {/* Playlist Info */}
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="w-48 h-48 flex-shrink-0">
          {playlist.imageUrl ? (
            <img
              src={playlist.imageUrl}
              alt={playlist.name}
              className="w-full h-full object-cover rounded-xl shadow-lg"
            />
          ) : (
            <div className="w-full h-full bg-gray-800 rounded-xl flex items-center justify-center">
              <Music className="w-16 h-16 text-gray-600" />
            </div>
          )}
        </div>
        <div>
          <span className="text-sm text-spotify-green font-medium">PLAYLIST</span>
          <h1 className="text-4xl font-bold text-white mt-1 mb-2">{playlist.name}</h1>
          <p className="text-gray-400 mb-4">{playlist.totalTracks} tracks analyzed</p>
          {playlist.description && (
            <p className="text-gray-500 text-sm">{playlist.description}</p>
          )}
        </div>
      </div>

      {/* Mood Categories */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">Mood Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(playlist.moodBreakdown || {}).map(([category, data]) => (
            <div
              key={category}
              className={`mood-${category} rounded-xl p-4 text-white`}
            >
              <div className="text-2xl mb-1">{MOOD_CATEGORIES[category]?.emoji}</div>
              <div className="font-semibold">{MOOD_CATEGORIES[category]?.label}</div>
              <div className="text-sm opacity-80">{data.count} tracks</div>
            </div>
          ))}
        </div>
      </div>

      {/* Mood Input Form */}
      <div className="bg-gray-800/50 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-spotify-green" />
          Get Mood-Based Recommendations
        </h2>
        <p className="text-gray-400 mb-6">
          Describe how you're feeling and we'll find the perfect songs from this playlist
        </p>

        <form onSubmit={generateRecommendations}>
          {/* Mood Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              How are you feeling?
            </label>
            <textarea
              value={moodInput}
              onChange={(e) => setMoodInput(e.target.value)}
              placeholder="e.g., Feeling relaxed after a long day, want something chill but not too sad..."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-spotify-green resize-none h-24"
              disabled={generating}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {['feeling happy', 'need energy', 'want to relax', 'feeling nostalgic', 'workout mode'].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setMoodInput(suggestion)}
                  className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded-full transition"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Duration
            </label>
            <div className="flex flex-wrap gap-2">
              {DURATION_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setDuration(preset.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    duration === preset.value
                      ? 'bg-spotify-green text-black'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Math.max(5, Math.min(480, parseInt(e.target.value) || 30)))}
                min="5"
                max="480"
                className="w-20 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:border-spotify-green"
              />
              <span className="text-gray-400">minutes</span>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm mb-4">{error}</p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={generating || !moodInput.trim()}
            className="w-full flex items-center justify-center gap-2 bg-spotify-green hover:bg-green-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-semibold py-4 rounded-lg transition text-lg"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating recommendations...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Get Recommendations
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
