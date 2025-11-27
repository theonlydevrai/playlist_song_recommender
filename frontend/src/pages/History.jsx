import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Clock, Music, ExternalLink, Loader2 } from 'lucide-react'

export default function History() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const response = await axios.get('/api/recommendations/history', { withCredentials: true })
      setSessions(response.data)
    } catch (err) {
      console.error('Failed to fetch history:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-spotify-green animate-spin" />
      </div>
    )
  }

  return (
    <div className="animate-slide-up">
      <h1 className="text-3xl font-bold text-white mb-2">Mood History</h1>
      <p className="text-gray-400 mb-8">Your past mood sessions and generated playlists</p>

      {sessions.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No history yet</h3>
          <p className="text-gray-500">Your mood sessions will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => navigate(`/recommendations/${session.id}`)}
              className="bg-gray-800/50 rounded-xl p-4 hover:bg-gray-800 transition cursor-pointer"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Music className="w-4 h-4 text-spotify-green" />
                    <span className="text-gray-400 text-sm">{session.playlistName}</span>
                  </div>
                  <p className="text-white font-medium mb-2">"{session.moodInput}"</p>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    {session.moodCategory && (
                      <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                        {session.moodCategory.replace('_', ' ')}
                      </span>
                    )}
                    <span className="text-gray-400">
                      {session.trackCount} tracks • {session.duration}
                    </span>
                    {session.savedToSpotify && (
                      <span className="bg-spotify-green/20 text-spotify-green px-2 py-1 rounded flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />
                        Saved
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-gray-500 text-sm">
                  {formatDate(session.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
