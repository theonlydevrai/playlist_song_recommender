import { useState } from 'react'
import axios from 'axios'
import { 
  Music2, Loader2, AlertCircle, Clock, Send, 
  Info, Zap, Copy, Check, ExternalLink,
  Smile, Moon, Heart, Flame, Coffee, Dumbbell, PartyPopper, CloudRain,
  RotateCcw, ListMusic, ChevronDown
} from 'lucide-react'

const MOOD_ICONS = {
  happy_energetic: Smile,
  calm_peaceful: Moon,
  melancholic: CloudRain,
  party_dance: PartyPopper,
  romantic: Heart,
  motivational: Dumbbell,
  chill_ambient: Coffee,
  intense_aggressive: Flame
}

const MOOD_LABELS = {
  happy_energetic: 'Happy',
  calm_peaceful: 'Calm',
  melancholic: 'Melancholic',
  party_dance: 'Party',
  romantic: 'Romantic',
  motivational: 'Motivational',
  chill_ambient: 'Chill',
  intense_aggressive: 'Intense'
}

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120]

export default function App() {
  // Step: 1=URL, 2=Mood, 3=Loading, 4=Results
  const [step, setStep] = useState(1)
  
  // Data states
  const [playlistUrl, setPlaylistUrl] = useState('')
  const [moodInput, setMoodInput] = useState('')
  const [duration, setDuration] = useState(30)
  const [playlist, setPlaylist] = useState(null)
  const [session, setSession] = useState(null)
  
  // UI states
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(null)
  const [showTip, setShowTip] = useState(false)

  const handleAnalyze = async (e) => {
    e.preventDefault()
    if (!playlistUrl.trim()) {
      setError('Please enter a playlist URL')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await axios.post('/api/playlists/analyze', {
        playlistUrl: playlistUrl.trim()
      })
      
      const playlistRes = await axios.get(`/api/playlists/${response.data.playlistId}`)
      setPlaylist(playlistRes.data)
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to analyze playlist')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!moodInput.trim()) return

    setLoading(true)
    setError('')
    setStep(3)

    try {
      const response = await axios.post('/api/recommendations', {
        playlistId: playlist.spotifyId || playlist.id || playlist._id,
        moodDescription: moodInput,
        durationMinutes: duration
      })
      
      // Fetch the session data
      const sessionRes = await axios.get(`/api/recommendations/${response.data.sessionId}`)
      setSession(sessionRes.data)
      setStep(4)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate recommendations')
      setStep(2)
    } finally {
      setLoading(false)
    }
  }

  const resetAll = () => {
    setStep(1)
    setPlaylist(null)
    setSession(null)
    setMoodInput('')
    setError('')
    setPlaylistUrl('')
  }

  const startNewMix = () => {
    setStep(2)
    setSession(null)
    setMoodInput('')
    setError('')
  }

  const copyToClipboard = (type) => {
    let text = ''
    if (type === 'names') {
      text = session.recommendations
        .map((track, i) => `${i + 1}. ${track.name} - ${track.artist}`)
        .join('\n')
    } else {
      text = session.recommendations
        .map(track => `spotify:track:${track.trackId}`)
        .join('\n')
    }
    
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  const formatDuration = (ms) => {
    if (!ms || isNaN(ms)) return '--:--'
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getMetrics = () => {
    if (!session?.recommendations?.length) {
      return { trackCount: 0, duration: '0 min', matchScore: 0 }
    }

    const totalMs = session.recommendations.reduce((sum, t) => sum + (t.duration_ms || 0), 0)
    const minutes = Math.round(totalMs / 60000)
    const avgScore = Math.round(
      session.recommendations.reduce((sum, t) => sum + (t.moodScore || 0), 0) / 
      session.recommendations.length
    )

    return {
      trackCount: session.recommendations.length,
      duration: minutes >= 60 ? `${Math.floor(minutes/60)}h ${minutes%60}m` : `${minutes} min`,
      matchScore: avgScore
    }
  }

  const metrics = getMetrics()

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800/50 flex-shrink-0">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={resetAll} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-spotify-green rounded-lg flex items-center justify-center">
              <Music2 className="w-5 h-5 text-black" />
            </div>
            <span className="font-semibold text-white">Mood Mixer</span>
          </button>
          {step > 1 && (
            <button 
              onClick={resetAll}
              className="text-gray-500 hover:text-white transition p-2 flex items-center gap-1 text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Start over
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-4 py-8 w-full">
        {/* Step Indicator (only show for steps 1-3) */}
        {step < 4 && (
          <div className="flex items-center justify-center gap-2 mb-10">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1 rounded-full transition-all ${
                  s === step ? 'w-8 bg-spotify-green' : 
                  s < step ? 'w-4 bg-spotify-green/50' : 'w-4 bg-gray-800'
                }`}
              />
            ))}
          </div>
        )}

        {/* Step 1: Playlist URL */}
        {step === 1 && (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">
                What's your playlist?
              </h1>
              <p className="text-gray-500">
                Paste a public Spotify playlist URL
              </p>
            </div>

            <form onSubmit={handleAnalyze} className="space-y-4">
              <input
                type="text"
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
                placeholder="https://open.spotify.com/playlist/..."
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-spotify-green/50 transition"
                disabled={loading}
              />

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !playlistUrl.trim()}
                className="w-full bg-spotify-green hover:bg-green-400 disabled:bg-gray-800 disabled:text-gray-600 text-black font-medium py-4 rounded-xl transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Continue'
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowTip(!showTip)}
                className="w-full flex items-center justify-center gap-1 text-gray-600 hover:text-gray-400 text-sm transition"
              >
                <Info className="w-4 h-4" />
                How to get playlist URL
                <ChevronDown className={`w-4 h-4 transition ${showTip ? 'rotate-180' : ''}`} />
              </button>
              
              {showTip && (
                <div className="text-gray-500 text-sm bg-gray-900/50 rounded-lg p-4 space-y-1">
                  <p>1. Open Spotify and find a playlist</p>
                  <p>2. Click the three dots menu</p>
                  <p>3. Select Share → Copy link</p>
                </div>
              )}
            </form>
          </div>
        )}

        {/* Step 2: Mood Input */}
        {step === 2 && playlist && (
          <div className="animate-fade-in">
            {/* Playlist Preview */}
            <div className="flex items-center gap-4 mb-6 p-3 bg-gray-900/50 rounded-xl">
              {playlist.imageUrl ? (
                <img src={playlist.imageUrl} alt="" className="w-12 h-12 rounded-lg" />
              ) : (
                <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                  <Music2 className="w-5 h-5 text-gray-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{playlist.name}</p>
                <p className="text-gray-500 text-sm">{playlist.totalTracks} tracks</p>
              </div>
            </div>

            {/* Mood Tags */}
            {playlist.moodBreakdown && Object.keys(playlist.moodBreakdown).length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {Object.entries(playlist.moodBreakdown)
                  .filter(([_, data]) => data.count > 0)
                  .sort((a, b) => b[1].count - a[1].count)
                  .slice(0, 4)
                  .map(([category, data]) => {
                    const Icon = MOOD_ICONS[category] || Music2
                    return (
                      <div key={category} className="flex items-center gap-2 bg-gray-900 rounded-lg px-3 py-1.5">
                        <Icon className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-gray-400 text-sm">{MOOD_LABELS[category]}</span>
                        <span className="text-gray-600 text-xs">{data.count}</span>
                      </div>
                    )
                  })}
              </div>
            )}

            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-white mb-1">How are you feeling?</h1>
              <p className="text-gray-500 text-sm">Describe your mood naturally</p>
            </div>

            <form onSubmit={handleGenerate} className="space-y-5">
              <textarea
                value={moodInput}
                onChange={(e) => setMoodInput(e.target.value)}
                placeholder="e.g., Feeling chill, want something relaxing..."
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-spotify-green/50 transition resize-none h-24"
                disabled={loading}
              />

              {/* Quick suggestions */}
              <div className="flex flex-wrap gap-2">
                {['feeling happy', 'need energy', 'want to relax', 'feeling nostalgic'].map((mood) => (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => setMoodInput(mood)}
                    className="text-xs bg-gray-900 hover:bg-gray-800 text-gray-400 px-3 py-1.5 rounded-lg transition"
                  >
                    {mood}
                  </button>
                ))}
              </div>

              {/* Duration */}
              <div>
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                  <Clock className="w-4 h-4" />
                  Duration
                </div>
                <div className="flex flex-wrap gap-2">
                  {DURATION_OPTIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      className={`px-4 py-2 rounded-lg text-sm transition ${
                        duration === d
                          ? 'bg-spotify-green text-black font-medium'
                          : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                      }`}
                    >
                      {d >= 60 ? `${d / 60}h` : `${d}m`}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !moodInput.trim()}
                className="w-full bg-spotify-green hover:bg-green-400 disabled:bg-gray-800 disabled:text-gray-600 text-black font-medium py-4 rounded-xl transition flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                Get Recommendations
              </button>
            </form>
          </div>
        )}

        {/* Step 3: Loading */}
        {step === 3 && (
          <div className="animate-fade-in text-center py-16">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-900 rounded-2xl mb-5">
              <Zap className="w-7 h-7 text-spotify-green animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Creating your mix</h2>
            <p className="text-gray-500 text-sm">Analyzing mood and selecting tracks...</p>
          </div>
        )}

        {/* Step 4: Results */}
        {step === 4 && session && (
          <div className="animate-fade-in">
            {/* Mood Summary */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 rounded-xl p-4 mb-4">
              <p className="text-gray-400 text-xs mb-1">Your mood</p>
              <p className="text-white">{session.moodInput}</p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-gray-900/50 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-white font-semibold">
                  <ListMusic className="w-4 h-4 text-gray-500" />
                  {metrics.trackCount}
                </div>
                <p className="text-gray-600 text-xs">Tracks</p>
              </div>
              <div className="bg-gray-900/50 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-white font-semibold">
                  <Clock className="w-4 h-4 text-gray-500" />
                  {metrics.duration}
                </div>
                <p className="text-gray-600 text-xs">Duration</p>
              </div>
              <div className="bg-gray-900/50 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-spotify-green font-semibold">
                  <Zap className="w-4 h-4" />
                  {metrics.matchScore}%
                </div>
                <p className="text-gray-600 text-xs">Match</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => copyToClipboard('names')}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-gray-300 py-2.5 rounded-xl transition text-sm"
              >
                {copied === 'names' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                Copy names
              </button>
              <button
                onClick={() => copyToClipboard('uris')}
                className="flex-1 flex items-center justify-center gap-2 bg-spotify-green hover:bg-green-400 text-black font-medium py-2.5 rounded-xl transition text-sm"
              >
                {copied === 'uris' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                Copy URIs
              </button>
            </div>

            {/* Track List */}
            <div className="bg-gray-900/30 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
              {session.recommendations?.map((track, index) => (
                <div
                  key={track.trackId || index}
                  className="flex items-center gap-3 p-2.5 hover:bg-gray-900/50 transition group border-b border-gray-800/30 last:border-0"
                >
                  <span className="w-5 text-center text-gray-600 text-xs">{index + 1}</span>
                  
                  <div className="w-9 h-9 flex-shrink-0">
                    {track.albumImage ? (
                      <img src={track.albumImage} alt="" className="w-full h-full object-cover rounded" />
                    ) : (
                      <div className="w-full h-full bg-gray-800 rounded flex items-center justify-center">
                        <Music2 className="w-3.5 h-3.5 text-gray-700" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{track.name || 'Unknown'}</p>
                    <p className="text-gray-500 text-xs truncate">{track.artist || 'Unknown'}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 text-xs hidden sm:block">{formatDuration(track.duration_ms)}</span>
                    <span className="text-xs bg-spotify-green/20 text-spotify-green px-1.5 py-0.5 rounded">
                      {track.moodScore || 0}%
                    </span>
                    {track.externalUrl && (
                      <a
                        href={track.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-gray-600 hover:text-white transition opacity-0 group-hover:opacity-100"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* New Mix Button */}
            <button
              onClick={startNewMix}
              className="w-full mt-4 bg-gray-900 hover:bg-gray-800 text-gray-300 py-3 rounded-xl transition text-sm flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              New mix from same playlist
            </button>

            <p className="text-center text-gray-700 text-xs mt-4">
              Paste URIs in Spotify's search to add tracks
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      {step === 1 && (
        <footer className="flex-shrink-0 p-4 text-center">
          <p className="text-gray-700 text-xs">No account needed. Only public playlist data is accessed.</p>
        </footer>
      )}
    </div>
  )
}
