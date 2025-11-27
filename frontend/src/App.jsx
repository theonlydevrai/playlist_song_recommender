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
    <div className="h-screen flex flex-col bg-[#0a0a0a] overflow-hidden">
      {/* Header - Centered */}
      <header className="flex-shrink-0 border-b border-[#404040]/20 px-6 py-3 bg-[#0f0f0f]/95">
        <div className="flex items-center justify-center relative">
          {showResults && (
            <button onClick={resetAll} className="absolute left-0 px-4 py-2 rounded-lg bg-[#141414] text-[#9a9a9a] hover:text-[#f5f5f5] border border-[#404040]/30 flex items-center gap-2 transition-colors">
              <RotateCcw className="w-4 h-4" /> New Mix
            </button>
          )}
          <button onClick={resetAll} className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#141414] border border-[#3b82f6]/20 rounded-xl flex items-center justify-center">
              <Music2 className="w-5 h-5 text-[#3b82f6]" />
            </div>
            <span className="font-medium text-[#f5f5f5] text-lg">Mood Mixer</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {/* Input Form */}
        {!showResults && !loading && (
          <div className="h-full flex items-center justify-center p-6">
            <form onSubmit={handleGenerateMix} className="w-full max-w-xl space-y-6">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-semibold text-[#f5f5f5] mb-2">Create your perfect mix</h1>
                <p className="text-[#707070] text-base">Paste a playlist, describe your mood, get personalized recommendations</p>
              </div>

              <div className="space-y-2">
                <label className="text-[#9a9a9a] text-sm font-medium flex items-center gap-2">
                  <Music2 className="w-4 h-4 text-[#3b82f6]" /> Spotify Playlist URL
                </label>
                <input
                  type="text"
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  placeholder="https://open.spotify.com/playlist/..."
                  className="w-full rounded-xl px-5 py-4 text-base bg-[#0f0f0f] border border-[#404040]/30 text-[#f5f5f5] placeholder-[#5a5a5a] focus:border-[#3b82f6]/50 focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[#9a9a9a] text-sm font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#FB7185]" /> Describe your vibe
                </label>
                <textarea
                  value={moodInput}
                  onChange={(e) => setMoodInput(e.target.value)}
                  placeholder="e.g., feeling chill and want something relaxing..."
                  className="w-full rounded-xl px-5 py-4 text-base bg-[#0f0f0f] border border-[#404040]/30 text-[#f5f5f5] placeholder-[#5a5a5a] focus:border-[#FB7185]/50 focus:outline-none resize-none h-24 transition-colors"
                />
                <div className="flex gap-2 mt-3">
                  {['energetic', 'chill', 'focus', 'melancholic'].map((mood) => (
                    <button
                      key={mood}
                      type="button"
                      onClick={() => setMoodInput(mood)}
                      className={`text-sm px-4 py-2 rounded-lg border transition-colors ${moodInput === mood ? 'bg-[#FB7185]/10 border-[#FB7185]/30 text-[#FB7185]' : 'bg-[#0f0f0f] border-[#404040]/30 text-[#707070] hover:text-[#9a9a9a] hover:border-[#707070]/50'}`}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[#9a9a9a] text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#9a9a9a]" /> Duration
                </label>
                <div className="flex gap-2">
                  {DURATION_OPTIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${duration === d ? 'bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/30' : 'bg-[#0f0f0f] text-[#707070] border border-[#404040]/30 hover:text-[#9a9a9a] hover:border-[#707070]/50'}`}
                    >
                      {d} min
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 text-[#FB7185] text-sm bg-[#FB7185]/10 rounded-xl px-4 py-3 border border-[#FB7185]/20">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!playlistUrl.trim() || !moodInput.trim()}
                className="w-full bg-[#3b82f6]/10 hover:bg-[#3b82f6]/20 disabled:bg-[#0f0f0f] disabled:text-[#5a5a5a] text-[#3b82f6] disabled:border-[#404040]/20 font-medium py-4 rounded-xl flex items-center justify-center gap-3 text-base border border-[#3b82f6]/30 hover:border-[#3b82f6]/50 transition-colors"
              >
                <Send className="w-5 h-5" /> Generate Mix
              </button>
              
              <p className="text-center text-[#5a5a5a] text-sm">No login required · Works with public playlists only</p>
            </form>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="h-full flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 text-[#3b82f6] animate-spin mb-4" />
            <p className="text-[#707070] text-lg">{loadingStatus}</p>
          </div>
        )}

        {/* Results */}
        {showResults && session && (
          <div className="h-full flex flex-col p-4 max-w-4xl mx-auto">
            {/* Stats Row */}
            <div className="flex-shrink-0 flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-5 text-sm">
                <span className="flex items-center gap-2 text-[#707070]">
                  <ListMusic className="w-4 h-4 text-[#3b82f6]" /> 
                  <span className="text-[#f5f5f5]">{metrics.count}</span> tracks
                </span>
                <span className="flex items-center gap-2 text-[#707070]">
                  <Clock className="w-4 h-4 text-[#FB7185]" /> 
                  <span className="text-[#f5f5f5]">{metrics.duration}</span> min
                </span>
                <span className="flex items-center gap-2 text-[#707070]">
                  <Zap className="w-4 h-4 text-[#9a9a9a]" /> 
                  <span className="text-[#f5f5f5]">{metrics.score}%</span> match
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => copyToClipboard('names')} className="text-sm px-4 py-2 rounded-lg bg-[#0f0f0f] border border-[#404040]/30 text-[#707070] hover:text-[#f5f5f5] hover:border-[#707070]/50 flex items-center gap-2 transition-colors">
                  {copied === 'names' ? <Check className="w-4 h-4 text-[#3b82f6]" /> : <Copy className="w-4 h-4" />} Names
                </button>
                <button onClick={() => copyToClipboard('uris')} className="text-sm px-4 py-2 rounded-lg bg-[#3b82f6]/10 border border-[#3b82f6]/30 text-[#3b82f6] hover:bg-[#3b82f6]/20 flex items-center gap-2 transition-colors">
                  {copied === 'uris' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} URIs
                </button>
              </div>
            </div>

            {/* Track List */}
            <div className="flex-1 overflow-y-auto rounded-xl bg-[#0f0f0f]/95 border border-[#404040]/20">
              {session.recommendations?.map((track, i) => (
                <div key={track.trackId || i} className="flex items-center gap-4 px-4 py-3 hover:bg-[#141414] border-b border-[#404040]/10 last:border-0 transition-colors group">
                  <span className="w-6 text-center text-[#5a5a5a] text-sm">{i + 1}</span>
                  {track.albumImage ? (
                    <img src={track.albumImage} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[#141414] flex items-center justify-center">
                      <Music2 className="w-4 h-4 text-[#5a5a5a]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[#f5f5f5] text-sm truncate">{track.name}</p>
                    <p className="text-[#5a5a5a] text-xs truncate">{track.artist}</p>
                  </div>
                  <span className="text-xs text-[#3b82f6] bg-[#3b82f6]/10 px-2.5 py-1 rounded-lg border border-[#3b82f6]/20">{track.moodScore || 0}%</span>
                  {track.externalUrl && (
                    <a href={track.externalUrl} target="_blank" rel="noopener noreferrer" className="text-[#5a5a5a] hover:text-[#3b82f6] transition-colors opacity-0 group-hover:opacity-100">
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
