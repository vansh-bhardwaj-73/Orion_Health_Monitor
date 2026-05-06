// diagnose.js — run this from your /server folder: node diagnose.js
require('dotenv').config();

const results = { cloudant: '...', watson: '...', twilio: '...' };

const line = () => console.log('-'.repeat(60));

async function checkCloudant() {
  line();
  console.log('CLOUDANT');
  console.log('  URL  :', process.env.CLOUDANT_URL    || 'MISSING');
  console.log('  KEY  :', process.env.CLOUDANT_APIKEY ? 'set' : 'MISSING');
  console.log('  DB   :', process.env.CLOUDANT_DB     || 'MISSING');

  if (!process.env.CLOUDANT_URL || !process.env.CLOUDANT_APIKEY || !process.env.CLOUDANT_DB) {
    results.cloudant = 'FAIL: Missing env vars';
    return;
  }

  try {
    const { CloudantV1 } = require('@ibm-cloud/cloudant');
    const { IamAuthenticator } = require('ibm-cloud-sdk-core');

    const client = new CloudantV1({
      authenticator: new IamAuthenticator({ apikey: process.env.CLOUDANT_APIKEY }),
      serviceUrl: process.env.CLOUDANT_URL,
    });

    const info = await client.getDatabaseInformation({ db: process.env.CLOUDANT_DB });
    console.log('  Docs :', info.result.docCount ?? info.result.doc_count ?? 'n/a');
    results.cloudant = 'OK: Connected';
  } catch (e) {
    console.log('  Error:', e.message);
    if (e.message.includes('401') || e.message.includes('403')) {
      console.log('  -> Auth failed. API key is invalid or expired. Regenerate on IBM Cloud.');
    } else if (e.message.includes('404')) {
      console.log('  -> Database not found. Will be auto-created on first server start.');
    } else if (e.message.includes('ENOTFOUND') || e.message.includes('ECONNREFUSED')) {
      console.log('  -> Cannot reach IBM Cloud. Check internet / firewall.');
    } else if (e.message.includes('suspended') || e.message.includes('429')) {
      console.log('  -> Cloudant Lite plan instance may be suspended. Log into IBM Cloud and reactivate.');
    }
    results.cloudant = 'FAIL: ' + e.message;
  }
}

async function checkWatson() {
  line();
  console.log('WATSON ASSISTANT');
  console.log('  KEY  :', process.env.WATSON_API_KEY        ? 'set' : 'MISSING');
  console.log('  URL  :', process.env.WATSON_URL            || 'MISSING');
  console.log('  AID  :', process.env.WATSON_ASSISTANT_ID  || 'MISSING');
  console.log('  ENV  :', process.env.WATSON_ENVIRONMENT_ID || 'MISSING');

  if (!process.env.WATSON_API_KEY || !process.env.WATSON_URL || !process.env.WATSON_ASSISTANT_ID || !process.env.WATSON_ENVIRONMENT_ID) {
    results.watson = 'FAIL: Missing env vars (need WATSON_API_KEY, WATSON_URL, WATSON_ASSISTANT_ID, WATSON_ENVIRONMENT_ID)';
    return;
  }

  try {
    const AssistantV2 = require('ibm-watson/assistant/v2');
    const { IamAuthenticator } = require('ibm-watson/auth');

    const assistant = new AssistantV2({
      version: '2023-06-15',
      authenticator: new IamAuthenticator({ apikey: process.env.WATSON_API_KEY }),
      serviceUrl: process.env.WATSON_URL,
    });

    const resp = await assistant.messageStateless({
      assistantId:   process.env.WATSON_ASSISTANT_ID,
      environmentId: process.env.WATSON_ENVIRONMENT_ID,
      userId:        'orion-diagnose',
      input: { message_type: 'text', text: 'hello' },
    });

    const intents = resp.result.output.intents || [];
    console.log('  Reply intents:', intents.length > 0 ? intents[0].intent : '(none — add Actions in Watson Assistant dashboard)');
    results.watson = 'OK: Connected';
  } catch (e) {
    console.log('  Error:', e.message);
    if (e.message.includes('401') || e.message.includes('403')) {
      console.log('  -> Auth failed. Regenerate API key from IBM Cloud > Watson Assistant > Service Credentials.');
    } else if (e.message.includes('404')) {
      console.log('  -> 404: Assistant or Environment ID not found.');
      console.log('     WATSON_ASSISTANT_ID: Settings > API Details > Assistant ID');
      console.log('     WATSON_ENVIRONMENT_ID: Environments panel > Draft > API Details > Environment ID');
    } else if (e.message.includes('ENOTFOUND')) {
      console.log('  -> Cannot reach Watson URL. Verify WATSON_URL matches your instance region.');
    }
    results.watson = 'FAIL: ' + e.message;
  }
}

async function checkTwilio() {
  line();
  console.log('TWILIO');
  console.log('  SID  :', process.env.TWILIO_SID        ? 'set' : 'MISSING');
  console.log('  TOKEN:', process.env.TWILIO_AUTH_TOKEN ? 'set' : 'MISSING');
  console.log('  PHONE:', process.env.TWILIO_PHONE      || 'MISSING');
  console.log('  WA   :', process.env.TWILIO_WHATSAPP   || 'MISSING');

  if (!process.env.TWILIO_SID || !process.env.TWILIO_AUTH_TOKEN) {
    results.twilio = 'FAIL: Missing env vars';
    return;
  }

  try {
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

    const account = await client.api.accounts(process.env.TWILIO_SID).fetch();
    console.log('  Account:', account.friendlyName, '|', account.status);

    if (account.status !== 'active') {
      console.log('  -> Account is NOT active. Check Twilio console.');
    }

    console.log('');
    console.log('  WhatsApp Sandbox: each contact must first send');
    console.log('  "join recent-even" to +14155238886 on WhatsApp to opt in.');

    results.twilio = 'OK: Connected (' + account.status + ')';
  } catch (e) {
    console.log('  Error:', e.message);
    if (e.message.includes('20003') || e.message.includes('authenticate')) {
      console.log('  -> Invalid credentials. Double-check TWILIO_SID and TWILIO_AUTH_TOKEN.');
    }
    results.twilio = 'FAIL: ' + e.message;
  }
}

async function run() {
  console.log('\nORION - Service Connection Diagnostics\n');
  await checkCloudant();
  await checkWatson();
  await checkTwilio();
  line();
  console.log('\nSUMMARY');
  console.log('  Cloudant :', results.cloudant);
  console.log('  Watson   :', results.watson);
  console.log('  Twilio   :', results.twilio);
  console.log('');
}

run().catch(console.error);
