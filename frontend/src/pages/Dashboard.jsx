import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Plus, Music, Trash2, ExternalLink, Loader2 } from 'lucide-react'

export default function Dashboard() {
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [playlistUrl, setPlaylistUrl] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchPlaylists()
  }, [])

  const fetchPlaylists = async () => {
    try {
      const response = await axios.get('/api/playlists', { withCredentials: true })
      setPlaylists(response.data)
    } catch (err) {
      console.error('Failed to fetch playlists:', err)
    } finally {
      setLoading(false)
    }
  }

  const analyzePlaylist = async (e) => {
    e.preventDefault()
    if (!playlistUrl.trim()) return

    setAnalyzing(true)
    setError('')

    try {
      const response = await axios.post('/api/playlists/analyze', 
        { playlistUrl },
        { withCredentials: true }
      )
      
      setPlaylistUrl('')
      navigate(`/playlist/${response.data.playlistId}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to analyze playlist')
    } finally {
      setAnalyzing(false)
    }
  }

  const deletePlaylist = async (id) => {
    if (!confirm('Remove this playlist from the app?')) return

    try {
      await axios.delete(`/api/playlists/${id}`, { withCredentials: true })
      setPlaylists(playlists.filter(p => p._id !== id))
    } catch (err) {
      console.error('Failed to delete playlist:', err)
    }
  }

  return (
    <div className="animate-slide-up">
      <h1 className="text-3xl font-bold text-white mb-2">Your Playlists</h1>
      <p className="text-gray-400 mb-8">Import a Spotify playlist to get mood-based recommendations</p>

      {/* Add Playlist Form */}
      <div className="bg-gray-800/50 rounded-xl p-6 mb-8">
        <form onSubmit={analyzePlaylist} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              placeholder="Paste Spotify playlist URL..."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-spotify-green"
              disabled={analyzing}
            />
          </div>
          <button
            type="submit"
            disabled={analyzing || !playlistUrl.trim()}
            className="flex items-center justify-center gap-2 bg-spotify-green hover:bg-green-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-semibold px-6 py-3 rounded-lg transition"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Analyze Playlist
              </>
            )}
          </button>
        </form>
        {error && (
          <p className="text-red-400 text-sm mt-3">{error}</p>
        )}
        <p className="text-gray-500 text-sm mt-3">
          Example: https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
        </p>
      </div>

      {/* Playlists Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-spotify-green animate-spin" />
        </div>
      ) : playlists.length === 0 ? (
        <div className="text-center py-12">
          <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No playlists yet</h3>
          <p className="text-gray-500">Paste a Spotify playlist URL above to get started</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {playlists.map((playlist) => (
            <div
              key={playlist._id}
              className="bg-gray-800/50 rounded-xl overflow-hidden hover:bg-gray-800 transition group"
            >
              <div className="aspect-square relative">
                {playlist.imageUrl ? (
                  <img
                    src={playlist.imageUrl}
                    alt={playlist.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                    <Music className="w-16 h-16 text-gray-600" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-4">
                  <button
                    onClick={() => navigate(`/playlist/${playlist._id}`)}
                    className="p-3 bg-spotify-green rounded-full text-black hover:scale-110 transition"
                  >
                    <ExternalLink className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => deletePlaylist(playlist._id)}
                    className="p-3 bg-red-500 rounded-full text-white hover:scale-110 transition"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-white truncate">{playlist.name}</h3>
                <p className="text-gray-400 text-sm">{playlist.totalTracks} tracks</p>
                <div className="mt-2">
                  {playlist.isProcessed ? (
                    <span className="text-xs bg-spotify-green/20 text-spotify-green px-2 py-1 rounded">
                      Analyzed
                    </span>
                  ) : (
                    <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded">
                      Processing...
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
