# Spotify Mood Recommender

An AI-powered web application that analyzes your Spotify playlists, categorizes songs by mood, and creates personalized playlists based on how you're feeling.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Python](https://img.shields.io/badge/Python-3.9+-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![License](https://img.shields.io/badge/License-MIT-yellow)

## Features

- **AI Mood Analysis** - Describe your mood in natural language, powered by Google Gemini
- **Smart Categorization** - Automatically groups songs into 8 mood categories
- **Duration Matching** - Creates playlists that fit your exact time needs
- **Spotify Integration** - Save generated playlists directly to your Spotify account
- **History Tracking** - Access your past mood sessions anytime

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express, MongoDB |
| ML Service | Python, Flask, scikit-learn |
| AI | Google Gemini API |
| Auth | Spotify OAuth 2.0 |

## Project Structure

```
spotify_recommender/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── models/         # MongoDB schemas
│   │   ├── routes/         # API endpoints
│   │   └── services/       # Spotify, Gemini, ML services
│   └── package.json
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   └── context/        # Auth context
│   └── package.json
├── ml-service/             # Python ML service
│   ├── app.py              # Flask server
│   └── requirements.txt
├── SETUP_GUIDE.md          # Detailed setup instructions
└── start-app.bat           # Windows quick launcher
```

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.9+
- MongoDB (local or [Atlas](https://mongodb.com/atlas))
- [Spotify Developer Account](https://developer.spotify.com/dashboard)
- [Google AI Studio API Key](https://aistudio.google.com/app/apikey)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd spotify_recommender
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   ```

4. **Setup ML Service**
   ```bash
   cd ml-service
   python -m venv venv
   
   # Windows
   .\venv\Scripts\activate
   
   # macOS/Linux
   source venv/bin/activate
   
   pip install -r requirements.txt
   ```

5. **Configure Environment Variables**
   
   Edit `backend/.env`:
   ```env
   SPOTIFY_CLIENT_ID=your_spotify_client_id
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   SPOTIFY_REDIRECT_URI=http://localhost:3001/auth/callback
   GEMINI_API_KEY=your_gemini_api_key
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_random_secret
   PORT=3001
   FRONTEND_URL=http://localhost:3000
   ML_SERVICE_URL=http://localhost:5000
   ```

### Running the App

**Option 1: Quick Start (Windows)**
```bash
# Double-click start-app.bat
```

**Option 2: Manual Start (3 terminals)**

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - ML Service
cd ml-service
.\venv\Scripts\activate  # Windows
python app.py

# Terminal 3 - Frontend
cd frontend && npm run dev
```

6. **Open** http://localhost:3000

## Detailed Setup

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for:
- Step-by-step API credential setup
- MongoDB Atlas configuration
- Troubleshooting guide
- Environment variables reference

## How It Works

1. **Connect** your Spotify account
2. **Import** a playlist by pasting its URL
3. **Wait** for automatic mood analysis (1-2 min)
4. **Describe** how you're feeling
5. **Set** your desired playlist duration
6. **Get** personalized song recommendations
7. **Save** the playlist to your Spotify

