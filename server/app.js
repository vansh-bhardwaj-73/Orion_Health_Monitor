const express = require('express');
const cors = require('cors');
const path = require('path');

const testRoutes = require('./routes/test.routes');
const userRoutes = require('./routes/user.routes');
const symptomRoutes = require('./routes/symptom.routes');
const statusRoutes = require('./routes/status.routes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend (CORRECT PLACE)
app.use(express.static(path.join(__dirname, '../client')));

// Routes
app.use('/api/test', testRoutes);
app.use('/api/users', userRoutes);
app.use('/api/symptoms', symptomRoutes);
app.use('/api/status', statusRoutes);

module.exports = app;