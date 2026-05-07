// FILE: app.js
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const testRoutes    = require('./routes/test.routes');
const userRoutes    = require('./routes/user.routes');
const symptomRoutes = require('./routes/symptom.routes');
const statusRoutes  = require('./routes/status.routes');
const notifyRoutes  = require('./routes/notify.routes');   // ← ADDED (matches SDA)

const app = express();

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());

// ===== STATIC FILES =====
app.use(express.static(path.join(__dirname, '../client')));

// ===== API ROUTES =====
app.use('/api/test',     testRoutes);
app.use('/api/users',    userRoutes);
app.use('/api/symptoms', symptomRoutes);
app.use('/api/status',   statusRoutes);
app.use('/api/notify',   notifyRoutes);   // ← ADDED

// ===== HEALTH CHECK (matches SDA) =====
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '🩺 Orion Health Monitor is running',
    time: new Date().toISOString()
  });
});

// ===== 404 HANDLER (matches SDA) =====
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`
  });
});

// ===== GLOBAL ERROR HANDLER (matches SDA) =====
app.use((err, req, res, next) => {
  console.error('❌ Global Error:', err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

module.exports = app;