// FILE: config/watson.js
// Matches SDA pattern: ibm-cloud-sdk-core authenticator, WATSON_ASSISTANT_* env vars,
// session store for multi-turn chat, stateless helper for one-shot classification.

const AssistantV2          = require('ibm-watson/assistant/v2');
const { IamAuthenticator } = require('ibm-cloud-sdk-core'); // ← ibm-cloud-sdk-core (matches SDA)

let assistant = null;

// ===== INIT =====
const initWatson = async () => {
  const apiKey      = process.env.WATSON_ASSISTANT_API_KEY;
  const serviceUrl  = process.env.WATSON_ASSISTANT_URL;
  const assistantId = process.env.WATSON_ASSISTANT_ID;
  const envId       = process.env.WATSON_ASSISTANT_ENV_ID;

  const missing = [];
  if (!apiKey)      missing.push('WATSON_ASSISTANT_API_KEY');
  if (!serviceUrl)  missing.push('WATSON_ASSISTANT_URL');
  if (!assistantId) missing.push('WATSON_ASSISTANT_ID');
  if (!envId)       missing.push('WATSON_ASSISTANT_ENV_ID');

  if (missing.length > 0) {
    console.warn(`⚠️  Watson disabled — missing: ${missing.join(', ')}`);
    console.warn('   Classifier will use keyword fallback.');
    return;
  }

  try {
    assistant = new AssistantV2({
      version: '2023-06-15',
      authenticator: new IamAuthenticator({ apikey: apiKey }),
      serviceUrl,
    });

    // Lightweight ping to verify credentials
    await assistant.messageStateless({
      assistantId,
      environmentId: envId,
      userId: 'orion-init-check',
      input: { message_type: 'text', text: 'ping' },
    });

    console.log('✅ Watson Assistant connected');

  } catch (error) {
    assistant = null;
    console.error('❌ Watson initialization failed:', error.message);

    if (error.message.includes('401') || error.message.includes('403')) {
      console.error('   → Invalid API key. Regenerate from IBM Cloud → Watson Assistant → Service credentials.');
    } else if (error.message.includes('404') || error.message.toLowerCase().includes('not found')) {
      console.error('   → Assistant/Environment ID not found.');
      console.error('     WATSON_ASSISTANT_ID: Watson Assistant → Settings → API Details → Assistant ID');
      console.error('     WATSON_ASSISTANT_ENV_ID: Watson Assistant → Environments → Draft → API Details → Environment ID');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('   → Cannot reach IBM Cloud. Check internet / firewall.');
    }

    console.warn('   Keyword fallback classifier active.');
  }
};

// ===== SESSION STORE (matches SDA's chatController pattern) =====
// Used if you add a chat/conversational endpoint to Orion later.
const sessions     = {};
const MAX_SESSIONS = 100;

const createSession = async () => {
  const res = await assistant.createSession({
    assistantId:   process.env.WATSON_ASSISTANT_ID,
    environmentId: process.env.WATSON_ASSISTANT_ENV_ID,
  });
  return res.result.session_id;
};

const getOrCreateSession = async (userId) => {
  if (!assistant) throw new Error('Watson not initialised');

  // Evict oldest session if at limit (matches SDA memory-leak prevention)
  if (Object.keys(sessions).length >= MAX_SESSIONS) {
    delete sessions[Object.keys(sessions)[0]];
  }

  if (!sessions[userId]) {
    sessions[userId] = await createSession();
  }

  return sessions[userId];
};

const deleteSession = (userId) => {
  delete sessions[userId];
};

// ===== ACCESSORS =====
const getAssistant   = () => assistant;
const getAssistantId = () => process.env.WATSON_ASSISTANT_ID;
const getEnvId       = () => process.env.WATSON_ASSISTANT_ENV_ID;

module.exports = {
  initWatson,
  getAssistant,
  getAssistantId,
  getEnvId,
  getOrCreateSession,
  deleteSession,
};
