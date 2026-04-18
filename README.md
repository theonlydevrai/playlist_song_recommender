# Mood Mixer

AI-powered playlist curator that analyzes public Spotify playlists and creates personalized recommendations based on your mood.

## Features

- **No Login Required** - Works with any public Spotify playlist URL
- **AI Mood Analysis** - Natural language mood input powered by Google Gemini
- **Seed Track Selection** - Pick specific songs from your playlist to include in the final mix
- **Mood Transitions** - Create playlists that smoothly flow through multiple moods in sequence
- **Smart Recommendations** - Matches songs using real Spotify audio data (energy, tempo, valence, etc.)
- **Duration Control** - Get playlists that fit your exact time needs
- **Easy Export** - Copy track names or Spotify URIs

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS
- **Backend**: Node.js, Express
- **ML Service**: Python, Flask
- **AI**: Google Gemini 2.5 Flash-Lite
- **Data**: Spotify Web API (Client Credentials)

## Prerequisites

- Node.js 18+ ([Download](https://nodejs.org/))
- Python 3.9+ ([Download](https://python.org/))
- Git ([Download](https://git-scm.com/))

## Setup Guide

### Step 1: Get API Credentials

**Spotify API:**

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in and click "Create App"
3. Fill in app name, description, and set redirect URI to `http://localhost:3001/callback`
4. Select "Web API" and save
5. Copy your **Client ID** and **Client Secret** from Settings

**Google Gemini API:**

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API Key"
3. Copy your **API Key**

### Step 2: Clone Repository

```bash
git clone <repo-url>
cd spotify_recommender
```

### Step 3: Setup Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env` with your credentials:

```env
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
GEMINI_API_KEY=your_gemini_api_key
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
ML_SERVICE_URL=http://localhost:5000
```

```bash
cd ..
```

### Step 4: Setup Frontend

```bash
cd frontend
npm install
cd ..
```

When running the frontend in WSL, use the dev server script above and open it from Windows at `http://localhost:3000`. The Vite dev server is configured to bind to `0.0.0.0`, so it can be reached from the Windows host browser.

### Step 5: Setup ML Service

```bash
cd ml-service
python -m venv venv

# Activate virtual environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Windows Command Prompt:
# venv\Scripts\activate.bat
# macOS/Linux:
# source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
cd ..
```

The ML service `.env` uses defaults (port 5000) - no changes needed.

### Step 6: Run the Application

Terminal 1 - Backend:

```bash
cd backend
npm run dev
```

Terminal 2 - ML Service:

```bash
cd ml-service
source venv/bin/activate
python app.py
```

Terminal 3 - Frontend:

```bash
cd frontend
npm run dev
```

### Step 7: Open the App

Go to http://localhost:3000

If you are on Windows + WSL, `http://localhost:3000` should open in Chrome on the Windows host as long as the dev servers are running in WSL.

## Usage

1. Paste a public Spotify playlist URL and click "Load Playlist"
2. Check songs you want to include as seed tracks (optional)
3. Choose single mood or build a mood journey (e.g., chill → romantic → energetic)
4. Select duration and click "Create Mix"
5. Copy results to your Spotify

## Project Structure

```
├── backend/          # Express API server (port 3001)
├── frontend/         # React app (port 3000)
├── ml-service/       # Python ML service (port 5000)
```

## Privacy

- No user authentication required
- No personal data stored
- Only public playlist data accessed
- Stateless - no database
