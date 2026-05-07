// FILE: server.js
require('dotenv').config();

const app = require('./app');
const { setupDatabase } = require('./config/cloudant');
const { initWatson }    = require('./config/watson');

const PORT = process.env.PORT || 5000;

// ── Crash Guards ──────────────────────────────────────────────────
process.on('uncaughtException',  (err)    => console.error('\n[ORION] Uncaught Exception:', err.message));
process.on('unhandledRejection', (reason) => console.error('\n[ORION] Unhandled Rejection:', reason?.message || reason));
process.on('SIGINT', () => { console.log('\n[ORION] Shutting down.\n'); process.exit(0); });

// ── Start ─────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    console.log('🔄 Starting Orion...');

    // Cloudant is required — stop if it fails
    await setupDatabase();

    // Watson is optional — falls back to keyword classifier
    await initWatson();

    app.listen(PORT, () => {
      console.log('');
      console.log('✅ ================================');
      console.log(`✅ ORION running on port ${PORT}`);
      console.log(`✅ Open: http://localhost:${PORT}`);
      console.log('✅ ================================');
      console.log('');
      console.log('📡 Routes active:');
      console.log('   POST /api/symptoms/log');
      console.log('   GET  /api/symptoms/:userId');
      console.log('   POST /api/users/create  |  GET /api/users/:id');
      console.log('   POST /api/notify/sos');
      console.log('   GET  /api/status');
      console.log('   GET  /api/health');
      console.log('');
    });

  } catch (err) {
    console.error('❌ Server failed to start:', err.message);
    process.exit(1);
  }
};

startServer();