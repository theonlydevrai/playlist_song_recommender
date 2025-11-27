# 🎵 Spotify Mood Recommender

An AI-powered web application that analyzes public Spotify playlists, categorizes songs by mood, and creates personalized recommendations based on how you're feeling.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Python](https://img.shields.io/badge/Python-3.9+-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

- **🔒 Privacy First** - No login required! Just paste a public playlist URL
- **🎭 AI Mood Analysis** - Describe your mood in natural language, powered by Google Gemini
- **📊 Smart Categorization** - Automatically groups songs into 8 mood categories
- **⏱️ Duration Matching** - Creates playlists that fit your exact time needs
- **📋 Easy Export** - Copy track names or Spotify URIs to add to your own playlists
- **🚀 No Database Required** - Stateless design, all processing happens in-memory

## 🖼️ How It Works

1. **Paste** a public Spotify playlist URL
2. **Wait** for automatic mood analysis (1-2 min)
3. **Describe** how you're feeling
4. **Set** your desired playlist duration
5. **Get** personalized song recommendations
6. **Copy** and add tracks to your Spotify manually

## 🏗️ Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| ML Service | Python, Flask, scikit-learn |
| AI | Google Gemini API |
| Spotify | Client Credentials Flow (no user auth) |

## 📁 Project Structure

```
spotify_recommender/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   └── services/       # Spotify, Gemini, ML services
│   └── package.json
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   └── pages/          # Page components
│   └── package.json
├── ml-service/             # Python ML service
│   ├── app.py              # Flask server
│   └── requirements.txt
├── SETUP_GUIDE.md          # Detailed setup instructions
└── start-app.bat           # Windows quick launcher
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.9+
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
   # Edit .env with your Spotify and Gemini API credentials
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
   GEMINI_API_KEY=your_gemini_api_key
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

## 📖 Detailed Setup

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for:
- Step-by-step API credential setup
- Troubleshooting guide

## 🔒 Privacy

This app is designed with privacy in mind:
- **No user login required**
- **No personal data collected**
- **Only accesses public playlist data**
- **No listening history tracked**
- **No database - everything is in-memory**
- Uses Spotify's Client Credentials flow (app-level access only)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Spotify Web API](https://developer.spotify.com/documentation/web-api)
- [Google Gemini API](https://ai.google.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
