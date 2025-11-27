# 🎵 Spotify Mood Recommender - Complete Setup Guide

A step-by-step guide to get the app running on your machine.

---

## 📋 Prerequisites

Before starting, make sure you have:

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Python 3.9+** - [Download here](https://python.org/)
- **Git** - [Download here](https://git-scm.com/)
- **A Google Account** (for Gemini API)

---

## 🚀 Step 1: Get API Credentials

### 1.1 Spotify API Setup

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account (create one if needed)
3. Click **"Create App"**
4. Fill in the details:
   - **App name**: `Mood Recommender` (or any name)
   - **App description**: `AI-powered mood-based playlist generator`
   - **Redirect URI**: `http://localhost:3001/callback` (required but not used)
   - **Which APIs?**: Select **Web API**
   - Check the Terms of Service box
5. Click **"Save"**
6. On your app page, click **"Settings"**
7. **Copy and save these values:**
   - `Client ID` (visible on the page)
   - `Client Secret` (click "View client secret")

> ℹ️ **Note:** We use Client Credentials Flow (no user login). The redirect URI is required by Spotify but won't be used.

### 1.2 Google Gemini API Setup

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Select a project (or create new one)
5. **Copy and save the API key**

---

## 📁 Step 2: Setup Environment Files

### 2.1 Backend Environment File

Navigate to the `backend` folder and create a `.env` file:

**Windows (PowerShell):**

```powershell
cd D:\AI_SLOP\spotify_recommender\backend
Copy-Item .env.example .env
notepad .env
```

**Or manually create** `backend\.env` with this content:

```env
# Spotify API Configuration (Client Credentials - No user login needed)
SPOTIFY_CLIENT_ID=paste_your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=paste_your_spotify_client_secret_here

# Google Gemini API
GEMINI_API_KEY=paste_your_gemini_api_key_here

# Server Configuration
PORT=3001
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# ML Service URL
ML_SERVICE_URL=http://localhost:5000
```

**⚠️ Important: Replace ALL placeholder values with your actual credentials!**

### 2.2 ML Service Environment File (Optional)

Navigate to `ml-service` folder and create `.env`:

**Windows (PowerShell):**

```powershell
cd D:\AI_SLOP\spotify_recommender\ml-service
Copy-Item .env.example .env
```

The default values work fine, but you can edit if needed:

```env
PORT=5000
DEBUG=True
```

### 2.3 Verify Your .env Files

Your folder structure should look like:

```
spotify_recommender/
├── backend/
│   ├── .env          ← YOU CREATED THIS
│   ├── .env.example
│   └── ...
├── frontend/
│   └── ...
├── ml-service/
│   ├── .env          ← YOU CREATED THIS (optional)
│   ├── .env.example
│   └── ...
└── .env.example
```

---

## Step 3: Install Dependencies

Open **three separate terminal windows** (PowerShell or Command Prompt).

### Terminal 1: Backend Dependencies

```powershell
cd D:\AI_SLOP\spotify_recommender\backend
npm install
```

Expected output: `added 150 packages...`

### Terminal 2: Frontend Dependencies

```powershell
cd D:\AI_SLOP\spotify_recommender\frontend
npm install
```

Expected output: `added 200+ packages...` (may take a few minutes)

### Terminal 3: ML Service Dependencies (with Virtual Environment)

```powershell
cd D:\AI_SLOP\spotify_recommender\ml-service

# Create virtual environment
python -m venv venv

# Activate virtual environment (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# If you get execution policy error, run this first:
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# For Command Prompt use:
# venv\Scripts\activate.bat

# Install dependencies
pip install -r requirements.txt
```

Expected output: `Successfully installed flask scikit-learn...`

**Note:** You'll see `(venv)` at the start of your terminal prompt when the virtual environment is active.

---

## Step 4: Run the Application

Keep the **three terminals open** and start each service:

### Terminal 1: Start Backend (Port 3001)

```powershell
cd D:\AI_SLOP\spotify_recommender\backend
npm run dev
```

You should see:

```
Server running on port 3001
```

### Terminal 2: Start ML Service (Port 5000)

```powershell
cd D:\AI_SLOP\spotify_recommender\ml-service

# Activate virtual environment first (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# For Command Prompt use:
# venv\Scripts\activate.bat

# Start the service
python app.py
```

You should see:

```
(venv) PS D:\...\ml-service>
 * Running on http://127.0.0.1:5000
 * Debug mode: on
```

### Terminal 3: Start Frontend (Port 3000)

```powershell
cd D:\AI_SLOP\spotify_recommender\frontend
npm run dev
```

You should see:

```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
```

---

## Step 5: Access the Application

1. Open your browser and go to: **http://localhost:3000**

2. You should see the landing page with "Mood Mixer"

3. Paste a public Spotify playlist URL to get started

---

## Step 6: Using the App

### Analyze a Playlist

1. Go to Spotify and find a public playlist you want to analyze
2. Click **Share** → **Copy link to playlist**
3. Paste the URL in the input box
4. Click **"Analyze Playlist"**
5. Wait for analysis (1-2 minutes for large playlists)

### Get Mood-Based Recommendations

1. After analyzing a playlist, you'll see the mood input screen
2. Type how you're feeling in the text box
   - Examples: "feeling happy", "need to relax", "workout mode"
3. Select duration (15min, 30min, 1hr, etc.)
4. Click **"Generate Mix"**

### Export to Spotify

1. Review the recommended tracks
2. Click **"Copy Track Names"** or **"Copy Spotify URIs"**
3. Open Spotify and create a new playlist
4. Search for the tracks or paste URIs to add them

---

## 🔧 Troubleshooting

### "Playlist not found" or "Cannot access playlist"

- Make sure the playlist is **public** (not private)
- Check the URL is correct and complete
- The playlist owner may have changed its visibility

### "Gemini API error" or mood analysis fails

- Check `GEMINI_API_KEY` is valid
- The app has a fallback for keyword-based analysis

### "Cannot connect to ML service"

- Make sure Python ML service is running on port 5000
- The backend has a fallback if ML service is down

### Frontend shows blank page

- Check browser console for errors (F12)
- Make sure backend is running on port 3001
- Check CORS settings in backend `.env`

### Port already in use

```powershell
# Find what's using the port
netstat -ano | findstr :3001

# Kill the process (replace PID with actual number)
taskkill /PID <PID> /F
```

---

## 📊 Environment Variables Reference

| Variable                | Description                | Example                               |
| ----------------------- | -------------------------- | ------------------------------------- |
| `SPOTIFY_CLIENT_ID`     | From Spotify Dashboard     | `abc123...`                           |
| `SPOTIFY_CLIENT_SECRET` | From Spotify Dashboard     | `xyz789...`                           |
| `GEMINI_API_KEY`        | From Google AI Studio      | `AIza...`                             |
| `PORT`                  | Backend server port        | `3001`                                |
| `FRONTEND_URL`          | Frontend URL for CORS      | `http://localhost:3000`               |
| `ML_SERVICE_URL`        | Python ML service URL      | `http://localhost:5000`               |

---

## Stopping the App

To stop each service, press `Ctrl + C` in each terminal window.

---

## Restarting the App

After initial setup, you only need to run:

```powershell
# Terminal 1 - Backend
cd D:\AI_SLOP\spotify_recommender\backend
npm run dev

# Terminal 2 - ML Service (activate venv first!)
cd D:\AI_SLOP\spotify_recommender\ml-service
.\venv\Scripts\Activate.ps1
python app.py

# Terminal 3 - Frontend
cd D:\AI_SLOP\spotify_recommender\frontend
npm run dev
```

---

## Quick Start Script (Optional)

Create a file `start-app.bat` in the `spotify_recommender` folder:

```batch
@echo off
echo Starting Spotify Mood Recommender...

start "Backend" cmd /k "cd /d D:\AI_SLOP\spotify_recommender\backend && npm run dev"
timeout /t 3
start "ML Service" cmd /k "cd /d D:\AI_SLOP\spotify_recommender\ml-service && venv\Scripts\activate.bat && python app.py"
timeout /t 2
start "Frontend" cmd /k "cd /d D:\AI_SLOP\spotify_recommender\frontend && npm run dev"

echo All services starting...
echo Open http://localhost:3000 in your browser
pause
```

Double-click this file to start all services at once!

---

## Setup Checklist

- [ ] Installed Node.js 18+
- [ ] Installed Python 3.9+
- [ ] Created Spotify Developer App
- [ ] Got Spotify Client ID and Secret
- [ ] Created Google Gemini API Key
- [ ] Created `backend/.env` with all credentials
- [ ] Installed backend dependencies (`npm install`)
- [ ] Installed frontend dependencies (`npm install`)
- [ ] Created Python virtual environment (`python -m venv venv`)
- [ ] Installed ML service dependencies (`pip install -r requirements.txt`)
- [ ] Started all three services (backend, ml-service, frontend)
- [ ] Analyzed first playlist

---

