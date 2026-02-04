import { useState } from 'react'
import axios from 'axios'
import { 
  Music2, Loader2, AlertCircle, Clock, Send, 
  Zap, Copy, Check, ExternalLink, RotateCcw, ListMusic
} from 'lucide-react'

const DURATION_OPTIONS = [15, 30, 45, 60, 90]

export default function App() {
  const [playlistUrl, setPlaylistUrl] = useState('')
  const [moodInput, setMoodInput] = useState('')
  const [duration, setDuration] = useState(30)
  const [session, setSession] = useState(null)
  
  // New State for multi-step flow
  const [playlistLoaded, setPlaylistLoaded] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [playlistTracks, setPlaylistTracks] = useState([])
  const [selectedTrackIds, setSelectedTrackIds] = useState(new Set())
  const [playlistId, setPlaylistId] = useState(null)
  
  const [loading, setLoading] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(null)

  const handleAnalyze = async (e) => {
    e.preventDefault()
    if (!playlistUrl.trim()) return setError('Please enter a playlist URL')
    
    setLoading(true)
    setError('')
    setLoadingStatus('Analyzing playlist...')

    try {
      const analyzeResponse = await axios.post('/api/playlists/analyze', {
        playlistUrl: playlistUrl.trim()
      })
      
      setPlaylistId(analyzeResponse.data.playlistId)
      const detailsResponse = await axios.get(`/api/playlists/${analyzeResponse.data.playlistId}`)
      
      setPlaylistTracks(detailsResponse.data.allTracks || [])
      setPlaylistLoaded(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to analyze playlist')
    } finally {
      setLoading(false)
      setLoadingStatus('')
    }
  }

  const handleGenerateMix = async () => {
    if (!moodInput.trim()) return setError('Please describe your mood')
    if (!playlistId) return setError('Please load a playlist first')

    setLoading(true)
    setError('')
    setLoadingStatus('Creating your mix...')

    try {
      const response = await axios.post('/api/recommendations', {
        playlistId: playlistId,
        moodDescription: moodInput,
        durationMinutes: duration,
        selectedTrackIds: Array.from(selectedTrackIds)
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

  const toggleTrackSelection = (id) => {
    const newSelected = new Set(selectedTrackIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedTrackIds(newSelected)
  }

  const resetAll = () => {
    setPlaylistLoaded(false)
    setShowResults(false)
    setSession(null)
    setMoodInput('')
    setError('')
    setPlaylistUrl('')
    setPlaylistTracks([])
    setSelectedTrackIds(new Set())
    setPlaylistId(null)
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
          {playlistLoaded && (
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

      {/* Main Content - Split View */}
      <main className="flex-1 overflow-hidden flex">
        {/* Left Panel - Input Controls (Always visible) */}
        <div className="w-[400px] border-r border-[#404040]/20 flex-shrink-0 overflow-hidden">
          <div className="h-full flex items-center px-6">
            <div className="space-y-5 w-full">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-semibold text-[#f5f5f5] mb-2">Create your perfect mix</h1>
                <p className="text-[#707070] text-sm">Configure your playlist and mood</p>
              </div>

              {/* Playlist URL Input */}
              <div className="space-y-2">
                <label className="text-[#9a9a9a] text-sm font-medium flex items-center gap-2">
                  <Music2 className="w-4 h-4 text-[#3b82f6]" /> Playlist URL
                </label>
                <input
                  type="text"
                  value={playlistUrl}
                  disabled={playlistLoaded}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !playlistLoaded && playlistUrl.trim() && !loading) {
                      handleAnalyze(e)
                    }
                  }}
                  placeholder="https://open.spotify.com/playlist/..."
                  className="w-full rounded-xl px-4 py-3 text-sm bg-[#0f0f0f] border border-[#404040]/30 text-[#f5f5f5] placeholder-[#5a5a5a] focus:border-[#3b82f6]/50 focus:outline-none transition-colors disabled:opacity-50"
                />
                {!playlistLoaded && (
                  <button 
                    onClick={handleAnalyze}
                    disabled={!playlistUrl.trim() || loading}
                    className="w-full py-2.5 rounded-xl text-sm font-medium bg-[#0f0f0f] hover:bg-[#141414] disabled:bg-[#0f0f0f] disabled:text-[#5a5a5a] text-[#3b82f6] disabled:border-[#404040]/20 border border-[#3b82f6]/30 hover:border-[#3b82f6]/50 transition-colors flex items-center justify-center gap-2"
                  >
                    {loading && !showResults ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Loading...</span>
                      </>
                    ) : (
                      <>
                        <Music2 className="w-4 h-4" />
                        <span>Load Playlist</span>
                      </>
                    )}
                  </button>
                )}
                {playlistLoaded && (
                  <div className="flex items-center gap-2 text-xs text-[#3b82f6] bg-[#3b82f6]/10 px-3 py-2 rounded-lg border border-[#3b82f6]/20">
                    <Check className="w-3.5 h-3.5" />
                    <span>Playlist loaded · {playlistTracks.length} tracks</span>
                  </div>
                )}
              </div>

              {/* Mood Input */}
              <div className="space-y-2">
                <label className="text-[#9a9a9a] text-sm font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#FB7185]" /> Your vibe
                </label>
                <textarea
                  value={moodInput}
                  onChange={(e) => setMoodInput(e.target.value)}
                  placeholder="e.g., feeling chill and want something relaxing..."
                  className="w-full rounded-xl px-4 py-3 text-sm bg-[#0f0f0f] border border-[#404040]/30 text-[#f5f5f5] placeholder-[#5a5a5a] focus:border-[#FB7185]/50 focus:outline-none resize-none h-20 transition-colors"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {['energetic', 'chill', 'focus', 'melancholic'].map((mood) => (
                    <button
                      key={mood}
                      type="button"
                      onClick={() => setMoodInput(mood)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${moodInput === mood ? 'bg-[#FB7185]/10 border-[#FB7185]/30 text-[#FB7185]' : 'bg-[#0f0f0f] border-[#404040]/30 text-[#707070] hover:text-[#9a9a9a] hover:border-[#707070]/50'}`}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration Selector */}
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
                      className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-colors ${duration === d ? 'bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/30' : 'bg-[#0f0f0f] text-[#707070] border border-[#404040]/30 hover:text-[#9a9a9a] hover:border-[#707070]/50'}`}
                    >
                      {d}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="flex items-center gap-3 text-[#FB7185] text-sm bg-[#FB7185]/10 rounded-xl px-4 py-3 border border-[#FB7185]/20">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
                </div>
              )}

              {/* Create Playlist Button */}
              <button
                onClick={handleGenerateMix}
                disabled={!moodInput.trim() || !playlistLoaded || loading}
                className="w-full bg-[#3b82f6]/10 hover:bg-[#3b82f6]/20 disabled:bg-[#0f0f0f] disabled:text-[#5a5a5a] text-[#3b82f6] disabled:border-[#404040]/20 font-medium py-4 rounded-xl flex items-center justify-center gap-3 text-base border border-[#3b82f6]/30 hover:border-[#3b82f6]/50 transition-colors"
              >
                {loading && showResults ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Regenerating...
                  </>
                ) : loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Creating Mix...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" /> {showResults ? 'Regenerate Mix' : 'Create Playlist'}
                  </>
                )}
              </button>
              
              {/* Helper Text */}
              <div className="pt-4 border-t border-[#404040]/20">
                 <p className="text-xs text-[#707070] text-center">
                    {!playlistLoaded && 'Load a playlist to get started'}
                    {playlistLoaded && !showResults && selectedTrackIds.size > 0 && `${selectedTrackIds.size} song${selectedTrackIds.size > 1 ? 's' : ''} selected - will be included and guide the style`}
                    {playlistLoaded && !showResults && selectedTrackIds.size === 0 && 'Optional: Select songs to include and guide the recommendation style'}
                 </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Playlist Selection or Results */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex flex-col p-4 relative">
            
            {/* LOADING VISUALIZER */}
            {loading && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0a0a0a]/80 backdrop-blur-sm">
                 <div className="flex flex-col items-center justify-center relative overflow-hidden rounded-xl w-full max-w-2xl h-[400px]">
                    {/* Audio Visualizer Background */}
                    <div className="absolute inset-0 flex items-end justify-center px-4 pb-8 blur-sm opacity-60">
                      <div className="flex items-end gap-[3px] h-full w-full justify-center">
                        {[...Array(40)].map((_, i) => (
                          <div
                            key={i}
                            className="flex-1 max-w-4 bg-gradient-to-t from-[#3b82f6] to-[#FB7185] rounded-t-sm"
                            style={{
                              animation: `audioBar${i % 5} ${1.2 + Math.random() * 1.3}s ease-in-out infinite alternate`,
                              animationDelay: `${Math.random() * 2}s`,
                              height: `${20 + Math.random() * 30}%`
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="relative z-10 flex flex-col items-center bg-[#0a0a0a]/90 px-8 py-6 rounded-2xl backdrop-blur-md border border-[#404040]/30">
                      <div className="flex items-end gap-1 h-10 mb-4">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className="w-1.5 bg-[#3b82f6] rounded-full"
                            style={{
                              animation: `audioBar${i} ${0.8 + Math.random() * 0.6}s ease-in-out infinite alternate`,
                              animationDelay: `${Math.random() * 0.5}s`,
                              height: '50%'
                            }}
                          />
                        ))}
                      </div>
                      <p className="text-[#f5f5f5] text-lg font-medium">{loadingStatus}</p>
                    </div>
                 </div>
              </div>
            )}

            {/* PLACEHOLDER - Initial State */}
            {!playlistLoaded && !loading && (
              <div className="h-full flex items-center justify-center rounded-xl bg-[#0f0f0f]/50 border border-[#404040]/20 border-dashed">
                <div className="text-center px-8">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#141414] border border-[#404040]/30 flex items-center justify-center">
                    <Music2 className="w-10 h-10 text-[#5a5a5a]" />
                  </div>
                  <h3 className="text-lg font-medium text-[#f5f5f5] mb-2">No Playlist Loaded</h3>
                  <p className="text-sm text-[#707070] max-w-md">
                    Enter a Spotify playlist URL and click "Load" to see all tracks here.
                    <br />You can then select specific songs to include in your mix.
                  </p>
                </div>
              </div>
            )}

            {/* SELECTION VIEW - After playlist loaded */}
            {playlistLoaded && !showResults && !loading && (
              <div className="flex flex-col h-full animate-fade-in">
                 <div className="flex-shrink-0 mb-4 px-2">
                   <h2 className="text-xl font-semibold text-[#f5f5f5]">Select Songs (Optional)</h2>
                   <p className="text-[#707070] text-sm">Check songs you absolutely want in the playlist. We'll find similar ones.</p>
                 </div>
                 <div className="flex-1 overflow-y-auto rounded-xl bg-[#0f0f0f]/50 border border-[#404040]/20">
                   {playlistTracks.map((track, i) => (
                      <div 
                        key={track.spotifyTrackId} 
                        onClick={() => toggleTrackSelection(track.spotifyTrackId)}
                        className={`flex items-center gap-4 px-4 py-3 hover:bg-[#141414] border-b border-[#404040]/10 last:border-0 transition-colors cursor-pointer group ${selectedTrackIds.has(track.spotifyTrackId) ? 'bg-[#3b82f6]/5' : ''}`}
                      >
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedTrackIds.has(track.spotifyTrackId) ? 'bg-[#3b82f6] border-[#3b82f6]' : 'border-[#404040] group-hover:border-[#707070]'}`}>
                           {selectedTrackIds.has(track.spotifyTrackId) && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        
                        {track.albumImage ? (
                          <img src={track.albumImage} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-[#141414] flex items-center justify-center">
                            <Music2 className="w-4 h-4 text-[#5a5a5a]" />
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${selectedTrackIds.has(track.spotifyTrackId) ? 'text-[#3b82f6] font-medium' : 'text-[#f5f5f5]'}`}>{track.name}</p>
                          <p className="text-[#5a5a5a] text-xs truncate">{track.artist}</p>
                        </div>
                        
                        {/* Metadata Badges */}
                        <div className="flex gap-2">
                           {track.audioFeatures?.energy > 0.7 && <span className="text-[10px] bg-[#FB7185]/10 text-[#FB7185] px-2 py-0.5 rounded">High Energy</span>}
                           {track.moodCategory && <span className="text-[10px] bg-[#3b82f6]/10 text-[#3b82f6] px-2 py-0.5 rounded">{track.moodCategory.replace('_', ' ')}</span>}
                        </div>
                      </div>
                   ))}
                 </div>
              </div>
            )}

            {/* RESULTS VIEW - After generation */}
            {showResults && session && !loading && (
              <div className="flex flex-col h-full animate-fade-in">
                {/* Stats Row */}
                <div className="flex-shrink-0 flex items-center justify-between mb-4 px-1">
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
          </div>
        </div>
      </main>

      <style>{`
        @keyframes audioBar0 { 0% { height: 15%; } 100% { height: 85%; } }
        @keyframes audioBar1 { 0% { height: 25%; } 100% { height: 95%; } }
        @keyframes audioBar2 { 0% { height: 10%; } 100% { height: 70%; } }
        @keyframes audioBar3 { 0% { height: 20%; } 100% { height: 90%; } }
        @keyframes audioBar4 { 0% { height: 30%; } 100% { height: 75%; } }
      `}</style>
    </div>
  )
}
