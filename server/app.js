const express = require('express');
const cors = require('cors');
const path = require('path');

const helmet = require('helmet');
const mongoose = require('mongoose');

const authRoutes = require('./routes/authRoutes');
const donationRoutes = require('./routes/donationRoutes');
const ngoRoutes = require('./routes/ngoRoutes');
const volunteerRoutes = require('./routes/volunteerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// Production-ready CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy violation: Origin ${origin} not permitted.`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Liveness Probe (Does the process respond?)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Readiness Probe (Is database connected and ready to serve traffic?)
app.get('/ready', (req, res) => {
  const mongoStatus = mongoose.connection.readyState;
  // 1 = connected
  if (mongoStatus === 1) {
    return res.status(200).json({
      status: 'READY',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  }

  const states = { 0: 'disconnected', 2: 'connecting', 3: 'disconnecting' };
  return res.status(503).json({
    status: 'NOT_READY',
    database: states[mongoStatus] || 'unknown',
    timestamp: new Date().toISOString()
  });
});

// Basic route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/ngos', ngoRoutes);
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Serve local uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 404 Route Not Found Middleware
app.use((req, res, next) => {
  res.status(404).json({ message: `Not Found - ${req.originalUrl}` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Payload too large. Maximum allowed size is 1MB.' });
  }
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({ message: `Invalid resource identifier: "${err.value}"` });
  }
  console.error('Global Error:', err);
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

module.exports = app;
