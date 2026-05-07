// diagnose.js — run from your /server folder:  node diagnose.js
// Tests Cloudant, Watson Assistant, and Twilio using the exact same
// env vars and SDK patterns as config/cloudant.js and config/watson.js.

require('dotenv').config();

const LINE = () => console.log('─'.repeat(62));
const OK   = (msg) => console.log(`  ✅ ${msg}`);
const WARN = (msg) => console.log(`  ⚠️  ${msg}`);
const ERR  = (msg) => console.log(`  ❌ ${msg}`);
const INFO = (msg) => console.log(`  ℹ️  ${msg}`);

const results = { cloudant: '…', watson: '…', twilio: '…' };

// ═══════════════════════════════════════════════════════════════════
// 1. CLOUDANT
//    Uses: CLOUDANT_URL, CLOUDANT_PASSWORD, CLOUDANT_DB_NAME
//    Same pattern as config/cloudant.js (IamAuthenticator from ibm-cloud-sdk-core,
//    getAllDbs() connection test)
// ═══════════════════════════════════════════════════════════════════
async function checkCloudant() {
  LINE();
  console.log('🔵  CLOUDANT');
  console.log('');

  const url    = process.env.CLOUDANT_URL;
  const apiKey = process.env.CLOUDANT_PASSWORD;   // ← CLOUDANT_PASSWORD (not CLOUDANT_APIKEY)
  const dbName = process.env.CLOUDANT_DB_NAME;    // ← CLOUDANT_DB_NAME (not CLOUDANT_DB)

  console.log(`  CLOUDANT_URL      : ${url      || '❌ NOT SET'}`);
  console.log(`  CLOUDANT_PASSWORD : ${apiKey   ? '✅ set' : '❌ NOT SET'}`);
  console.log(`  CLOUDANT_DB_NAME  : ${dbName   || '❌ NOT SET'}`);
  console.log('');

  const missing = [];
  if (!url)    missing.push('CLOUDANT_URL');
  if (!apiKey) missing.push('CLOUDANT_PASSWORD');
  if (!dbName) missing.push('CLOUDANT_DB_NAME');

  if (missing.length > 0) {
    ERR(`Missing env vars: ${missing.join(', ')}`);
    results.cloudant = `FAIL — missing: ${missing.join(', ')}`;
    return;
  }

  try {
    // Use ibm-cloud-sdk-core (matches config/cloudant.js)
    const { CloudantV1 }       = require('@ibm-cloud/cloudant');
    const { IamAuthenticator } = require('ibm-cloud-sdk-core');

    const client = new CloudantV1({
      authenticator: new IamAuthenticator({ apikey: apiKey }),
      serviceUrl: url,
    });

    // Connection test: getAllDbs() (matches config/cloudant.js)
    const dbList = await client.getAllDbs();
    OK(`Connection successful`);

    // Check if the target DB exists
    if (dbList.result.includes(dbName)) {
      const info = await client.getDatabaseInformation({ db: dbName });
      OK(`Database "${dbName}" exists — ${info.result.doc_count ?? 'n/a'} docs`);
    } else {
      WARN(`Database "${dbName}" does not exist yet — will be auto-created on server start`);
    }

    results.cloudant = 'OK ✅';
  } catch (e) {
    ERR(`${e.message}`);

    if (e.message.includes('401') || e.message.includes('403')) {
      WARN('Auth failed — CLOUDANT_PASSWORD (API key) is invalid or expired.');
      INFO('Fix: IBM Cloud → Resource List → Cloudant → Service Credentials → New Credential → copy apikey');
    } else if (e.message.includes('ENOTFOUND') || e.message.includes('ECONNREFUSED')) {
      WARN('Cannot reach IBM Cloud. Check your internet connection or firewall.');
    } else if (e.message.includes('suspended') || e.message.includes('429')) {
      WARN('Cloudant Lite plan instance may be suspended (inactivity).');
      INFO('Fix: Log into IBM Cloud and reactivate the Cloudant instance.');
    }

    results.cloudant = `FAIL — ${e.message}`;
  }
}

// ═══════════════════════════════════════════════════════════════════
// 2. WATSON ASSISTANT (New Experience)
//    Uses: WATSON_ASSISTANT_API_KEY, WATSON_ASSISTANT_URL,
//          WATSON_ASSISTANT_ID, WATSON_ASSISTANT_ENV_ID
//    Same pattern as config/watson.js (IamAuthenticator from ibm-cloud-sdk-core,
//    messageStateless ping)
// ═══════════════════════════════════════════════════════════════════
async function checkWatson() {
  LINE();
  console.log('🟣  WATSON ASSISTANT (New Experience)');
  console.log('');

  const apiKey      = process.env.WATSON_ASSISTANT_API_KEY;  // ← not WATSON_API_KEY
  const serviceUrl  = process.env.WATSON_ASSISTANT_URL;      // ← not WATSON_URL
  const assistantId = process.env.WATSON_ASSISTANT_ID;
  const envId       = process.env.WATSON_ASSISTANT_ENV_ID;   // ← not WATSON_ENVIRONMENT_ID

  console.log(`  WATSON_ASSISTANT_API_KEY : ${apiKey      ? '✅ set' : '❌ NOT SET'}`);
  console.log(`  WATSON_ASSISTANT_URL     : ${serviceUrl  || '❌ NOT SET'}`);
  console.log(`  WATSON_ASSISTANT_ID      : ${assistantId || '❌ NOT SET'}`);
  console.log(`  WATSON_ASSISTANT_ENV_ID  : ${envId       || '❌ NOT SET'}`);
  console.log('');

  const missing = [];
  if (!apiKey)      missing.push('WATSON_ASSISTANT_API_KEY');
  if (!serviceUrl)  missing.push('WATSON_ASSISTANT_URL');
  if (!assistantId) missing.push('WATSON_ASSISTANT_ID');
  if (!envId)       missing.push('WATSON_ASSISTANT_ENV_ID');

  if (missing.length > 0) {
    ERR(`Missing env vars: ${missing.join(', ')}`);
    results.watson = `FAIL — missing: ${missing.join(', ')}`;
    return;
  }

  try {
    // Use ibm-cloud-sdk-core (matches config/watson.js)
    const AssistantV2          = require('ibm-watson/assistant/v2');
    const { IamAuthenticator } = require('ibm-cloud-sdk-core');

    const assistant = new AssistantV2({
      version: '2023-06-15',
      authenticator: new IamAuthenticator({ apikey: apiKey }),
      serviceUrl,
    });

    // Ping with messageStateless (matches config/watson.js initWatson)
    const resp = await assistant.messageStateless({
      assistantId,
      environmentId: envId,
      userId: 'orion-diagnose',
      input: { message_type: 'text', text: 'hello' },
    });

    OK('Connection successful');

    // New Experience (Actions) — output.intents is always []
    // Read the reply from output.generic instead
    const generic = resp.result.output?.generic || [];
    const reply   = generic.find(g => g.response_type === 'text');

    if (reply?.text) {
      OK(`Watson replied: "${reply.text.substring(0, 80)}${reply.text.length > 80 ? '…' : ''}"`);
    } else {
      WARN('Watson connected but returned no text reply.');
      INFO('This is normal if your Assistant has no trained Actions yet.');
      INFO('Add Actions in Watson Assistant dashboard to get responses.');
    }

    results.watson = 'OK ✅';
  } catch (e) {
    ERR(`${e.message}`);

    if (e.message.includes('401') || e.message.includes('403')) {
      WARN('Auth failed — WATSON_ASSISTANT_API_KEY is invalid or expired.');
      INFO('Fix: IBM Cloud → Watson Assistant service → Service Credentials → New Credential');
    } else if (e.message.includes('404') || e.message.toLowerCase().includes('not found')) {
      WARN('Assistant or Environment not found (404).');
      INFO('WATSON_ASSISTANT_ID:    Watson Assistant → Settings → API Details → Assistant ID');
      INFO('WATSON_ASSISTANT_ENV_ID: Watson Assistant → Environments → Draft → API Details → Environment ID');
      INFO('These are two different IDs — make sure you copied the right one for each.');
    } else if (e.message.toLowerCase().includes('no instance') || e.message.includes('invalid url')) {
      WARN('"No instance" error — WATSON_ASSISTANT_URL may be wrong.');
      INFO(`Current URL: ${process.env.WATSON_ASSISTANT_URL}`);
      INFO('Expected:    https://api.us-south.assistant.watson.cloud.ibm.com');
      INFO('             (New Experience does NOT need /instances/{id} in the URL)');
    } else if (e.message.includes('ENOTFOUND') || e.message.includes('ECONNREFUSED')) {
      WARN('Cannot reach IBM Cloud. Check internet / firewall.');
    }

    results.watson = `FAIL — ${e.message}`;
  }
}

// ═══════════════════════════════════════════════════════════════════
// 3. TWILIO
//    Uses: TWILIO_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE, TWILIO_WHATSAPP
//    Same pattern as controllers/notifyController.js
// ═══════════════════════════════════════════════════════════════════
async function checkTwilio() {
  LINE();
  console.log('🟢  TWILIO');
  console.log('');

  const sid      = process.env.TWILIO_SID;
  const token    = process.env.TWILIO_AUTH_TOKEN;
  const phone    = process.env.TWILIO_PHONE;
  const whatsapp = process.env.TWILIO_WHATSAPP;

  console.log(`  TWILIO_SID        : ${sid      ? '✅ set' : '❌ NOT SET'}`);
  console.log(`  TWILIO_AUTH_TOKEN : ${token    ? '✅ set' : '❌ NOT SET'}`);
  console.log(`  TWILIO_PHONE      : ${phone    || '❌ NOT SET'}`);
  console.log(`  TWILIO_WHATSAPP   : ${whatsapp || '❌ NOT SET'}`);
  console.log('');

  if (!sid || !token) {
    ERR('Missing TWILIO_SID or TWILIO_AUTH_TOKEN');
    results.twilio = 'FAIL — missing credentials';
    return;
  }

  try {
    const twilio  = require('twilio');
    const client  = twilio(sid, token);

    // Lightweight account check — no message sent
    const account = await client.api.accounts(sid).fetch();
    OK(`Account: "${account.friendlyName}" — status: ${account.status}`);

    if (account.status !== 'active') {
      WARN(`Account status is "${account.status}" — not active. Check Twilio console.`);
    }

    // WhatsApp sandbox reminder
    console.log('');
    INFO('WhatsApp Sandbox reminder:');
    INFO('  Each emergency contact must first send your sandbox join-keyword');
    INFO(`  to ${whatsapp || 'whatsapp:+14155238886'} on WhatsApp before they can receive messages.`);
    INFO('  Find your keyword: Twilio Console → Messaging → Try it out → Send a WhatsApp message');

    // Phone number check
    if (!phone) {
      WARN('TWILIO_PHONE not set — SMS (non-WhatsApp) will be skipped.');
    }

    results.twilio = `OK ✅ (${account.status})`;
  } catch (e) {
    ERR(`${e.message}`);

    if (e.message.includes('20003') || e.message.toLowerCase().includes('authenticate')) {
      WARN('Invalid credentials — double-check TWILIO_SID and TWILIO_AUTH_TOKEN.');
      INFO('Find them at: https://console.twilio.com → Account Info panel');
    } else if (e.message.includes('20404')) {
      WARN('Account not found. Make sure TWILIO_SID is the Account SID (starts with AC…).');
    }

    results.twilio = `FAIL — ${e.message}`;
  }
}

// ═══════════════════════════════════════════════════════════════════
// RUN ALL CHECKS
// ═══════════════════════════════════════════════════════════════════
async function run() {
  console.log('\n🔍  ORION — Service Connection Diagnostics\n');

  await checkCloudant();
  await checkWatson();
  await checkTwilio();

  LINE();
  console.log('\n📋  SUMMARY\n');
  console.log(`  Cloudant : ${results.cloudant}`);
  console.log(`  Watson   : ${results.watson}`);
  console.log(`  Twilio   : ${results.twilio}`);
  console.log('');

  const allOk = Object.values(results).every(r => r.startsWith('OK'));
  if (allOk) {
    console.log('  🎉 All services connected. Run node server.js to start Orion.\n');
  } else {
    console.log('  ⚠️  Fix the FAIL items above, then run node diagnose.js again.\n');
  }
}

run().catch(console.error);
