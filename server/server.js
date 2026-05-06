// FILE: server.js
require('dotenv').config();

const app = require('./app');
const { initCloudant } = require('./config/cloudant');

const PORT = process.env.PORT || 5000;

// ── Crash Guards ──────────────────────────────────────────────────
// Keep the server alive if any unhandled error occurs
process.on('uncaughtException', (err) => {
  console.error('\n[ORION] Uncaught Exception (server kept alive):', err.message);
});

process.on('unhandledRejection', (reason) => {
  const msg = reason && reason.message ? reason.message : String(reason);
  console.error('\n[ORION] Unhandled Rejection (server kept alive):', msg);
});

// ── Graceful Shutdown ─────────────────────────────────────────────
process.on('SIGINT', () => {
  console.log('\n\n[ORION] Server shutting down. Goodbye.\n');
  process.exit(0);
});

// ── Start ─────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    await initCloudant();

    const server = app.listen(PORT, () => {
      console.log('');
      console.log('=======================================================');
      console.log('         ORION HEALTH MONITOR  -  SERVER ONLINE         ');
      console.log('=======================================================');
      console.log('  Frontend  ->  http://localhost:' + PORT);
      console.log('  API Base  ->  http://localhost:' + PORT + '/api');
      console.log('  Status    ->  http://localhost:' + PORT + '/api/status');
      console.log('-------------------------------------------------------');
      console.log('  Server is LIVE. Press Ctrl+C to stop.');
      console.log('=======================================================');
      console.log('');
    });

    // Catch HTTP server-level errors (e.g. EADDRINUSE)
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error('[ORION] Port ' + PORT + ' is already in use. Kill the other process first.');
      } else {
        console.error('[ORION] Server error:', err.message);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error('[ORION] Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();