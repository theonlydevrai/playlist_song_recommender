require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const promClient = require('prom-client');

const playlistRoutes = require('./routes/playlists');
const recommendationRoutes = require('./routes/recommendations');

const app = express();
const PORT = process.env.PORT || 3001;
const metricsRegistry = new promClient.Registry();
promClient.collectDefaultMetrics({ register: metricsRegistry });
const httpRequestCounter = new promClient.Counter({
  name: 'backend_http_requests_total',
  help: 'Total backend HTTP requests',
  labelNames: ['method', 'path', 'status']
});

// App runs behind Kubernetes Service + nginx, so trust forwarded client IP.
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});

app.use('/api/', limiter);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  res.on('finish', () => {
    httpRequestCounter.labels(req.method, req.path, String(res.statusCode)).inc();
  });
  next();
});

// Routes
app.use('/api/playlists', playlistRoutes);
app.use('/api/recommendations', recommendationRoutes);

app.get('/api/recommendations', (req, res) => {
  res.json({
    message: 'Use POST /api/recommendations to generate a mix.',
    example: {
      playlistId: 'your-analyzed-playlist-id',
      moodDescription: 'chill and focused',
      durationMinutes: 30
    },
    supportedModes: ['single mood', 'mood journey']
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', metricsRegistry.contentType);
  res.end(await metricsRegistry.metrics());
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
