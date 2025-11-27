import { useState } from 'react'
import axios from 'axios'
import { 
  Music2, Loader2, AlertCircle, Clock, Send, 
  Zap, Copy, Check, ExternalLink, RotateCcw, ListMusic
} from 'lucide-react'

const DURATION_OPTIONS = [15, 30, 45, 60, 90]

export default function App() {
  const [showResults, setShowResults] = useState(false)
  const [playlistUrl, setPlaylistUrl] = useState('')
  const [moodInput, setMoodInput] = useState('')
  const [duration, setDuration] = useState(30)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(null)

  const handleGenerateMix = async (e) => {
    e.preventDefault()
    if (!playlistUrl.trim()) return setError('Please enter a playlist URL')
    if (!moodInput.trim()) return setError('Please describe your mood')

    setLoading(true)
    setError('')

    try {
      setLoadingStatus('Analyzing playlist...')
      const analyzeResponse = await axios.post('/api/playlists/analyze', {
        playlistUrl: playlistUrl.trim()
      })
      
      setLoadingStatus('Creating your mix...')
      const response = await axios.post('/api/recommendations', {
        playlistId: analyzeResponse.data.playlistId,
        moodDescription: moodInput,
        durationMinutes: duration
      })
      
      setSession(response.data)
      setShowResults(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate mix')
    } finally {
      setLoading(false)
      setLoadingStatus('')
    }
  }

  const resetAll = () => {
    setShowResults(false)
    setSession(null)
    setMoodInput('')
    setError('')
    setPlaylistUrl('')
  }

  const copyToClipboard = (type) => {
    const text = type === 'names' 
      ? session.recommendations.map((t, i) => `${i + 1}. ${t.name} - ${t.artist}`).join('\n')
      : session.recommendations.map(t => `spotify:track:${t.trackId}`).join('\n')
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  const metrics = session?.recommendations?.length ? {
    count: session.recommendations.length,
    duration: Math.round(session.recommendations.reduce((s, t) => s + (t.duration_ms || 0), 0) / 60000),
    score: Math.round(session.recommendations.reduce((s, t) => s + (t.moodScore || 0), 0) / session.recommendations.length)
  } : { count: 0, duration: 0, score: 0 }

  return (
    <div className="h-screen flex flex-col bg-surface-950 overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-surface-800 px-4 py-2">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={resetAll} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-accent-coral to-amber rounded-lg flex items-center justify-center">
              <Music2 className="w-4 h-4 text-surface-950" />
            </div>
            <span className="font-semibold text-text-primary">Mood Mixer</span>
          </button>
          {showResults && (
            <button onClick={resetAll} className="text-xs px-3 py-1.5 rounded-lg bg-surface-850 text-surface-400 hover:text-text-primary border border-surface-700 flex items-center gap-1.5">
              <RotateCcw className="w-3 h-3" /> New
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {/* Input Form */}
        {!showResults && !loading && (
          <div className="h-full flex items-center justify-center p-4">
            <form onSubmit={handleGenerateMix} className="w-full max-w-md space-y-4">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-text-primary">Create your perfect mix</h1>
                <p className="text-surface-400 text-sm mt-1">Paste playlist, describe mood, get recommendations</p>
              </div>

              <input
                type="text"
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
                placeholder="Spotify playlist URL..."
                className="w-full rounded-xl px-4 py-3 text-sm bg-surface-850 border border-surface-700 text-text-primary placeholder-surface-500 focus:border-accent-coral focus:outline-none"
              />

              <div>
                <textarea
                  value={moodInput}
                  onChange={(e) => setMoodInput(e.target.value)}
                  placeholder="Describe your vibe..."
                  className="w-full rounded-xl px-4 py-3 text-sm bg-surface-850 border border-surface-700 text-text-primary placeholder-surface-500 focus:border-accent-coral focus:outline-none resize-none h-16"
                />
                <div className="flex gap-1.5 mt-2">
                  {['energetic', 'chill', 'focus', 'sad'].map((mood) => (
                    <button
                      key={mood}
                      type="button"
                      onClick={() => setMoodInput(mood)}
                      className={`text-xs px-3 py-1 rounded-lg border ${moodInput === mood ? 'bg-accent-coral/20 border-accent-coral/50 text-accent-coral' : 'bg-surface-850 border-surface-700 text-surface-400'}`}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-surface-500" />
                <div className="flex gap-1.5 flex-1">
                  {DURATION_OPTIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${duration === d ? 'bg-mint/20 text-mint border border-mint/30' : 'bg-surface-850 text-surface-400 border border-surface-700'}`}
                    >
                      {d}m
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-accent-coral text-xs bg-accent-coral/10 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!playlistUrl.trim() || !moodInput.trim()}
                className="w-full bg-gradient-to-r from-accent-coral to-amber disabled:from-surface-700 disabled:to-surface-700 disabled:text-surface-500 text-surface-950 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 text-sm"
              >
                <Send className="w-4 h-4" /> Generate Mix
              </button>
              
              <p className="text-center text-surface-600 text-xs">No login needed · Public playlists only</p>
            </form>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="h-full flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 text-accent-coral animate-spin mb-4" />
            <p className="text-surface-400">{loadingStatus}</p>
          </div>
        )}

        {/* Results */}
        {showResults && session && (
          <div className="h-full flex flex-col p-4 max-w-4xl mx-auto">
            {/* Stats Row */}
            <div className="flex-shrink-0 flex items-center justify-between mb-3">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-surface-400">
                  <ListMusic className="w-4 h-4 text-sky" /> {metrics.count} tracks
                </span>
                <span className="flex items-center gap-1.5 text-surface-400">
                  <Clock className="w-4 h-4 text-accent-coral" /> {metrics.duration}m
                </span>
                <span className="flex items-center gap-1.5 text-mint">
                  <Zap className="w-4 h-4" /> {metrics.score}% match
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => copyToClipboard('names')} className="text-xs px-3 py-1.5 rounded-lg bg-surface-850 border border-surface-700 text-surface-400 hover:text-text-primary flex items-center gap-1.5">
                  {copied === 'names' ? <Check className="w-3 h-3 text-mint" /> : <Copy className="w-3 h-3" />} Names
                </button>
                <button onClick={() => copyToClipboard('uris')} className="text-xs px-3 py-1.5 rounded-lg bg-accent-coral/20 border border-accent-coral/30 text-accent-coral flex items-center gap-1.5">
                  {copied === 'uris' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} URIs
                </button>
              </div>
            </div>

            {/* Track List */}
            <div className="flex-1 overflow-y-auto rounded-xl bg-surface-900 border border-surface-800">
              {session.recommendations?.map((track, i) => (
                <div key={track.trackId || i} className="flex items-center gap-3 px-3 py-2 hover:bg-surface-850 border-b border-surface-800/50 last:border-0">
                  <span className="w-5 text-center text-surface-600 text-xs">{i + 1}</span>
                  {track.albumImage ? (
                    <img src={track.albumImage} alt="" className="w-9 h-9 rounded object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded bg-surface-800 flex items-center justify-center">
                      <Music2 className="w-4 h-4 text-surface-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm truncate">{track.name}</p>
                    <p className="text-surface-500 text-xs truncate">{track.artist}</p>
                  </div>
                  <span className="text-xs text-mint bg-mint/10 px-2 py-0.5 rounded">{track.moodScore || 0}%</span>
                  {track.externalUrl && (
                    <a href={track.externalUrl} target="_blank" rel="noopener noreferrer" className="text-surface-600 hover:text-accent-coral">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
