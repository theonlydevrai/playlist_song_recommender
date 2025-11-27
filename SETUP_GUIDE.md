# Spotify Mood Recommender - Complete Setup Guide

A step-by-step guide to get the app running on your machine.

---

## Prerequisites

Before starting, make sure you have:

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Python 3.9+** - [Download here](https://python.org/)
- **MongoDB Compass** - [Download here](https://www.mongodb.com/try/download/compass) (Recommended)
- **Git** - [Download here](https://git-scm.com/)
- **A Spotify Account** (free or premium)
- **A Google Account** (for Gemini API)

---

## Step 1: Get API Credentials

### 1.1 Spotify API Setup

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click **"Create App"**
4. Fill in the details:
   - **App name**: `Mood Recommender` (or any name)
   - **App description**: `AI-powered mood-based playlist generator`
   - **Redirect URI**: `http://localhost:3001/auth/callback`
   - **Which APIs?**: Select **Web API**
   - Check the Terms of Service box
5. Click **"Save"**
6. On your app page, click **"Settings"**
7. **Copy and save these values:**
   - `Client ID` (visible on the page)
   - `Client Secret` (click "View client secret")

### 1.2 Google Gemini API Setup

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Select a project (or create new one)
5. **Copy and save the API key**

### 1.3 MongoDB Setup (Choose ONE option)

#### Option A: MongoDB Compass (Recommended - Desktop App)

MongoDB Compass is the easiest way to run MongoDB locally with a nice GUI.

1. Download [MongoDB Compass](https://www.mongodb.com/try/download/compass)
2. Install with default settings
3. Open MongoDB Compass
4. On first launch, it will prompt to connect
5. Use the default connection string: `mongodb://localhost:27017`
6. Click **"Connect"**
7. MongoDB Compass will automatically start a local MongoDB instance

**Your connection string for .env:**

```
mongodb://localhost:27017/spotify_mood_recommender
```

**Note:** Make sure MongoDB Compass is running when you start the app!

#### Option B: MongoDB Atlas (Cloud - Free Tier)

Best if you want your data accessible from anywhere.

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Click **"Try Free"** and create an account
3. Create a new cluster:
   - Choose **FREE Shared** tier
   - Select a region close to you
   - Click **"Create Cluster"** (takes 1-3 minutes)
4. Setup Database Access:
   - Go to **"Database Access"** in sidebar
   - Click **"Add New Database User"**
   - Choose **"Password"** authentication
   - Enter username: `spotifyapp`
   - Enter password: `your-secure-password` (save this!)
   - Click **"Add User"**
5. Setup Network Access:
   - Go to **"Network Access"** in sidebar
   - Click **"Add IP Address"**
   - Click **"Allow Access from Anywhere"** (or add your IP)
   - Click **"Confirm"**
6. Get Connection String:
   - Go to **"Database"** in sidebar
   - Click **"Connect"** on your cluster
   - Choose **"Connect your application"**
   - Copy the connection string (looks like):
     ```
     mongodb+srv://spotifyapp:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
   - **Replace `<password>` with your actual password**
   - **Add database name**: `spotify_mood_recommender` after `.net/`

**Your connection string for .env:**

```
mongodb+srv://spotifyapp:yourpassword@cluster0.xxxxx.mongodb.net/spotify_mood_recommender?retryWrites=true&w=majority
```

#### Option C: MongoDB Community Server (Local Installation)

For advanced users who want full control.

1. Download [MongoDB Community Server](https://www.mongodb.com/try/download/community)
2. Install with default settings (includes MongoDB as a Windows Service)
3. MongoDB runs automatically on startup

**Your connection string for .env:**

```
mongodb://localhost:27017/spotify_mood_recommender
```

---

## Step 2: Setup Environment Files

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
# Spotify API Configuration
SPOTIFY_CLIENT_ID=paste_your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=paste_your_spotify_client_secret_here
SPOTIFY_REDIRECT_URI=http://localhost:3001/auth/callback

# Google Gemini API
GEMINI_API_KEY=paste_your_gemini_api_key_here

# MongoDB Configuration
# For Atlas (cloud):
MONGODB_URI=mongodb+srv://spotifyapp:yourpassword@cluster0.xxxxx.mongodb.net/spotify_mood_recommender?retryWrites=true&w=majority
# For Local MongoDB:
# MONGODB_URI=mongodb://localhost:27017/spotify_mood_recommender

# JWT Secret (generate a random string)
JWT_SECRET=my-super-secret-jwt-key-change-this-to-something-random

# Server Configuration
PORT=3001
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# ML Service URL
ML_SERVICE_URL=http://localhost:5000
```

**Important: Replace ALL placeholder values with your actual credentials!**

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
Connected to MongoDB
```

**If you see MongoDB connection error:**

- Check your `MONGODB_URI` in `.env`
- Make sure MongoDB Atlas allows your IP
- Verify username/password are correct

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

2. You should see the landing page with "Mood Mixer" and a green "Connect with Spotify" button

3. Click **"Connect with Spotify"**

4. Log in with your Spotify account and authorize the app

5. You'll be redirected to the Dashboard

---

## Step 6: Using the App

### Import a Playlist

1. Go to Spotify and find a playlist you want to analyze
2. Click **Share** → **Copy link to playlist**
3. Paste the URL in the dashboard input box
4. Click **"Analyze Playlist"**
5. Wait for analysis (1-2 minutes for large playlists)

### Get Mood-Based Recommendations

1. Click on an analyzed playlist
2. See the mood breakdown of your songs
3. Type how you're feeling in the text box
   - Examples: "feeling happy", "need to relax", "workout mode"
4. Select duration (15min, 30min, 1hr, etc.)
5. Click **"Get Recommendations"**

### Save to Spotify

1. Review the recommended tracks
2. Give your playlist a name (optional)
3. Click **"Save to Spotify"**
4. Open Spotify - your new playlist is there!

---

## Troubleshooting

### "MongoDB connection error"

- **MongoDB Compass**: Make sure Compass is open and connected before starting the backend
- Verify your `MONGODB_URI` is correct in `backend/.env`
- For Atlas: Check Network Access allows your IP
- For Local: Make sure MongoDB service is running

### "Spotify authentication failed"

- Check `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`
- Verify redirect URI is exactly `http://localhost:3001/auth/callback`
- Make sure you added the redirect URI in Spotify Dashboard

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

## Environment Variables Reference

| Variable                | Description                | Example                               |
| ----------------------- | -------------------------- | ------------------------------------- |
| `SPOTIFY_CLIENT_ID`     | From Spotify Dashboard     | `abc123...`                           |
| `SPOTIFY_CLIENT_SECRET` | From Spotify Dashboard     | `xyz789...`                           |
| `SPOTIFY_REDIRECT_URI`  | OAuth callback URL         | `http://localhost:3001/auth/callback` |
| `GEMINI_API_KEY`        | From Google AI Studio      | `AIza...`                             |
| `MONGODB_URI`           | Database connection string | `mongodb+srv://...`                   |
| `JWT_SECRET`            | Random secret for sessions | `any-random-string`                   |
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
- [ ] Installed MongoDB Compass (and connected)
- [ ] Created Spotify Developer App
- [ ] Got Spotify Client ID and Secret
- [ ] Created Google Gemini API Key
- [ ] Created `backend/.env` with all credentials
- [ ] Installed backend dependencies (`npm install`)
- [ ] Installed frontend dependencies (`npm install`)
- [ ] Created Python virtual environment (`python -m venv venv`)
- [ ] Installed ML service dependencies (`pip install -r requirements.txt`)
- [ ] Started MongoDB Compass and connected
- [ ] Started all three services (backend, ml-service, frontend)
- [ ] Successfully logged in with Spotify
- [ ] Analyzed first playlist

---
