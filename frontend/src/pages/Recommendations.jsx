import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { ArrowLeft, Save, ExternalLink, Clock, Sparkles, Loader2, Check, Music } from 'lucide-react'

export default function Recommendations() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [playlistName, setPlaylistName] = useState('')
  const [savedUrl, setSavedUrl] = useState('')

  useEffect(() => {
    fetchSession()
  }, [sessionId])

  const fetchSession = async () => {
    try {
      const response = await axios.get(`/api/recommendations/${sessionId}`, { withCredentials: true })
      setSession(response.data)
      setSaved(response.data.savedToSpotify)
      if (response.data.savedToSpotify) {
        setSavedUrl(`https://open.spotify.com/playlist/${response.data.spotifyPlaylistId}`)
      }
    } catch (err) {
      console.error('Failed to fetch session:', err)
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const saveToSpotify = async () => {
    setSaving(true)
    try {
      const response = await axios.post(`/api/recommendations/${sessionId}/save`, {
        name: playlistName || `Mood: ${session.moodInput.slice(0, 30)}`
      }, { withCredentials: true })

      setSaved(true)
      setSavedUrl(response.data.spotifyPlaylistUrl)
    } catch (err) {
      console.error('Failed to save to Spotify:', err)
    } finally {
      setSaving(false)
    }
  }

  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-spotify-green animate-spin" />
      </div>
    )
  }

  if (!session) return null

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

      {/* Mood Analysis */}
      <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-xl p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white/10 rounded-xl">
            <Sparkles className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white mb-1">Mood Analysis</h2>
            <p className="text-gray-300 mb-3">"{session.moodInput}"</p>
            <div className="flex flex-wrap gap-2">
              {session.moodAnalysis?.emotions?.map((emotion, i) => (
                <span key={i} className="bg-white/10 text-white px-3 py-1 rounded-full text-sm">
                  {emotion}
                </span>
              ))}
              {session.moodAnalysis?.mood_category && (
                <span className="bg-spotify-green/20 text-spotify-green px-3 py-1 rounded-full text-sm">
                  {session.moodAnalysis.mood_category.replace('_', ' ')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{session.recommendations?.length || 0}</div>
          <div className="text-gray-400 text-sm">Tracks</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{session.totalDurationFormatted}</div>
          <div className="text-gray-400 text-sm">Duration</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-spotify-green">
            {session.moodAnalysis?.energy_level || '-'}/10
          </div>
          <div className="text-gray-400 text-sm">Energy</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">
            {session.moodAnalysis?.valence_level || '-'}/10
          </div>
          <div className="text-gray-400 text-sm">Positivity</div>
        </div>
      </div>

      {/* Save to Spotify */}
      <div className="bg-gray-800/50 rounded-xl p-6 mb-8">
        {saved ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-spotify-green/20 rounded-full">
                <Check className="w-5 h-5 text-spotify-green" />
              </div>
              <span className="text-white font-medium">Saved to Spotify!</span>
            </div>
            <a
              href={savedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-spotify-green hover:bg-green-400 text-black font-semibold px-6 py-3 rounded-lg transition"
            >
              <ExternalLink className="w-5 h-5" />
              Open in Spotify
            </a>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              placeholder={`Mood: ${session.moodInput.slice(0, 30)}`}
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-spotify-green"
            />
            <button
              onClick={saveToSpotify}
              disabled={saving}
              className="flex items-center justify-center gap-2 bg-spotify-green hover:bg-green-400 disabled:bg-gray-600 text-black font-semibold px-6 py-3 rounded-lg transition"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save to Spotify
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Track List */}
      <div className="bg-gray-800/50 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Recommended Tracks</h2>
        </div>
        <div className="divide-y divide-gray-700/50">
          {session.recommendations?.map((track, index) => (
            <div
              key={track.trackId}
              className="flex items-center gap-4 p-4 hover:bg-gray-700/30 transition"
            >
              <div className="w-8 text-center text-gray-500 text-sm">
                {index + 1}
              </div>
              <div className="w-12 h-12 flex-shrink-0">
                {track.albumImage ? (
                  <img
                    src={track.albumImage}
                    alt={track.name}
                    className="w-full h-full object-cover rounded"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-700 rounded flex items-center justify-center">
                    <Music className="w-6 h-6 text-gray-600" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white truncate">{track.name}</div>
                <div className="text-gray-400 text-sm truncate">{track.artist}</div>
                {track.reason && (
                  <div className="text-spotify-green text-xs mt-1 truncate">
                    {track.reason}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-gray-500 text-sm hidden sm:block">
                  {formatDuration(track.duration_ms)}
                </div>
                <div className="bg-spotify-green/20 text-spotify-green px-2 py-1 rounded text-xs font-medium">
                  {track.moodScore}%
                </div>
                {track.externalUrl && (
                  <a
                    href={track.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-400 hover:text-white transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
