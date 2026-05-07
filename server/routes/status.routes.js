// FILE: routes/status.routes.js
// Uses config/ singletons — never creates clients per-request (matches SDA pattern).

const express = require('express');
const router  = express.Router();

const { cloudant, DB_NAME }                        = require('../config/cloudant');
const { getAssistant, getAssistantId, getEnvId }   = require('../config/watson');

// GET /api/status
router.get('/', async (req, res) => {
  const status = {
    cloudant:   false,
    watson:     false,
    classifier: true,    // keyword fallback always works
    timestamp:  new Date().toISOString(),
  };

  // ── Cloudant ──────────────────────────────────────────────────
  try {
    await cloudant.getDatabaseInformation({ db: DB_NAME });
    status.cloudant = true;
  } catch (e) {
    status.cloudantError = e.message;
  }

  // ── Watson ────────────────────────────────────────────────────
  const assistant   = getAssistant();
  const assistantId = getAssistantId();
  const envId       = getEnvId();

  if (!assistant) {
    status.watsonError =
      'Watson not initialised — check WATSON_ASSISTANT_API_KEY, WATSON_ASSISTANT_URL, ' +
      'WATSON_ASSISTANT_ID, WATSON_ASSISTANT_ENV_ID in .env';
  } else {
    try {
      await assistant.messageStateless({
        assistantId,
        environmentId: envId,
        userId: 'orion-status-check',
        input: { message_type: 'text', text: 'ping' },
      });
      status.watson = true;
    } catch (e) {
      status.watsonError = e.message;
    }
  }

  res.status(status.cloudant && status.watson ? 200 : 207).json(status);
});

module.exports = router;
