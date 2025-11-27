import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Home, Clock, LogOut, Music } from 'lucide-react'

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-md sticky top-0 z-50 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Music className="w-8 h-8 text-spotify-green" />
            <span className="text-xl font-bold text-white">Mood Mixer</span>
          </Link>

          <nav className="flex items-center gap-6">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-gray-300 hover:text-white transition"
            >
              <Home className="w-5 h-5" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <Link
              to="/history"
              className="flex items-center gap-2 text-gray-300 hover:text-white transition"
            >
              <Clock className="w-5 h-5" />
              <span className="hidden sm:inline">History</span>
            </Link>

            {user && (
              <div className="flex items-center gap-4 ml-4 pl-4 border-l border-gray-700">
                <div className="flex items-center gap-2">
                  {user.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt={user.displayName}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-spotify-green flex items-center justify-center">
                      {user.displayName?.[0] || 'U'}
                    </div>
                  )}
                  <span className="text-sm text-gray-300 hidden md:inline">
                    {user.displayName}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-gray-400 hover:text-white transition"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
