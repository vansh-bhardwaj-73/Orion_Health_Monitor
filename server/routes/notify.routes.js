// FILE: routes/notify.routes.js
// Matches SDA's notifyRoutes.js pattern.

const express = require('express');
const router  = express.Router();

const { sendEmergencyAlert } = require('../controllers/notifyController');

// POST /api/notify/sos → Send SOS to emergency contacts
router.post('/sos', sendEmergencyAlert);

module.exports = router;
