import { useAuth } from '../context/AuthContext'
import { useSearchParams } from 'react-router-dom'
import { Music, Sparkles, Clock, ListMusic, ArrowRight } from 'lucide-react'

export default function Landing({ error }) {
  const { login } = useAuth()
  const [searchParams] = useSearchParams()
  const errorMessage = searchParams.get('error')

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 pt-20 pb-32">
        <div className="text-center">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="p-4 rounded-full bg-spotify-green/20">
              <Music className="w-16 h-16 text-spotify-green" />
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Mood <span className="text-spotify-green">Mixer</span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            Your AI-powered Spotify companion that creates perfect playlists 
            based on your mood and time. Just describe how you feel.
          </p>

          {error && errorMessage && (
            <div className="bg-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6 max-w-md mx-auto">
              Authentication failed: {errorMessage}
            </div>
          )}

          <button
            onClick={login}
            className="inline-flex items-center gap-3 bg-spotify-green hover:bg-green-400 text-black font-bold py-4 px-8 rounded-full text-lg transition transform hover:scale-105"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            Connect with Spotify
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-32">
          <div className="bg-gray-800/50 rounded-2xl p-8 text-center">
            <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-7 h-7 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">AI Mood Detection</h3>
            <p className="text-gray-400">
              Describe your mood in your own words. Our AI understands emotions 
              and context to find the perfect songs.
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-2xl p-8 text-center">
            <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Clock className="w-7 h-7 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Perfect Timing</h3>
            <p className="text-gray-400">
              Set your desired duration and get a playlist that fits your 
              time perfectly. Great for commutes, workouts, or study sessions.
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-2xl p-8 text-center">
            <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <ListMusic className="w-7 h-7 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">From Your Music</h3>
            <p className="text-gray-400">
              Works with your existing Spotify playlists. Discover hidden gems 
              in your own collection organized by mood.
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-32">
          <h2 className="text-3xl font-bold text-white text-center mb-12">How It Works</h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-spotify-green text-black font-bold flex items-center justify-center">
                1
              </div>
              <span className="text-gray-300">Import your playlist</span>
            </div>
            <ArrowRight className="hidden md:block w-6 h-6 text-gray-600" />
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-spotify-green text-black font-bold flex items-center justify-center">
                2
              </div>
              <span className="text-gray-300">Describe your mood</span>
            </div>
            <ArrowRight className="hidden md:block w-6 h-6 text-gray-600" />
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-spotify-green text-black font-bold flex items-center justify-center">
                3
              </div>
              <span className="text-gray-300">Get perfect music</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 text-center text-gray-500 text-sm">
        <p>Built with ❤️ using Spotify API & Google Gemini AI</p>
      </footer>
    </div>
  )
}
