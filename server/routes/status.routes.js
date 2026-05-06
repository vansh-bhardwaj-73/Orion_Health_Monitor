// FILE: routes/status.routes.js
// Live health-check for Watson, Cloudant, and Classifier
const express = require('express');
const router = express.Router();
const { getClient, getDbName } = require('../config/cloudant');

// GET /api/status
router.get('/', async (req, res) => {
  const status = {
    cloudant: false,
    watson: false,
    classifier: true, // keyword fallback always works
    timestamp: new Date().toISOString(),
  };

  // 1. Check Cloudant
  try {
    const client = getClient();
    const db = getDbName();
    await client.getDatabaseInformation({ db });
    status.cloudant = true;
  } catch (e) {
    status.cloudantError = e.message;
  }

  // 2. Check Watson
  try {
    const AssistantV2 = require('ibm-watson/assistant/v2');
    const { IamAuthenticator } = require('ibm-watson/auth');

    if (process.env.WATSON_API_KEY && process.env.WATSON_URL && process.env.WATSON_ENVIRONMENT_ID) {
      const assistant = new AssistantV2({
        version: '2023-06-15',
        authenticator: new IamAuthenticator({ apikey: process.env.WATSON_API_KEY }),
        serviceUrl: process.env.WATSON_URL,
      });

      // Lightweight ping — send a test message
      await assistant.messageStateless({
        assistantId:   process.env.WATSON_ASSISTANT_ID,
        environmentId: process.env.WATSON_ENVIRONMENT_ID,
        userId:        'orion-status-check',
        input: { message_type: 'text', text: 'ping' },
      });
      status.watson = true;
    }
  } catch (e) {
    status.watsonError = e.message;
  }

  const allOk = status.cloudant && status.watson;
  res.status(allOk ? 200 : 207).json(status);
});

module.exports = router;
