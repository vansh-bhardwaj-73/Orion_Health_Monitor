// FILE: services/sms.service.js

let twilioClient = null;

try {
  const twilio = require('twilio');
  const sid = process.env.TWILIO_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  if (sid && token) {
    twilioClient = twilio(sid, token);
    console.log('✅ Twilio client initialized');
  } else {
    console.warn('⚠️  Twilio credentials missing — SMS will be mocked.');
  }
} catch (e) {
  console.warn('⚠️  Twilio package not found — SMS will be mocked. Run: npm install twilio');
}

/**
 * Send an SMS or WhatsApp message via Twilio.
 * @param {string} to  - E.164 phone number e.g. +918851393969
 * @param {string} msg - Message body
 * @param {boolean} useWhatsApp - If true, sends via WhatsApp sandbox
 */
const sendEmergencySMS = async (to, msg, useWhatsApp = false) => {
  if (!to) {
    console.warn('SMS: No recipient number provided.');
    return false;
  }

  // Build from/to strings
  const fromNumber = useWhatsApp
    ? (process.env.TWILIO_WHATSAPP || 'whatsapp:+14155238886')
    : process.env.TWILIO_PHONE;

  const toNumber = useWhatsApp ? `whatsapp:${to}` : to;

  if (twilioClient && fromNumber) {
    try {
      const message = await twilioClient.messages.create({
        body: msg,
        from: fromNumber,
        to: toNumber,
      });
      console.log(`✅ ${useWhatsApp ? 'WhatsApp' : 'SMS'} sent → ${toNumber} | SID: ${message.sid}`);
      return true;
    } catch (err) {
      console.error(`❌ Twilio send failed → ${toNumber}:`, err.message);
      return false;
    }
  }

  // MOCK fallback
  console.log('\n=========================================');
  console.log('📱 MOCK SMS DISPATCHED');
  console.log('=========================================');
  console.log(`TO: ${toNumber}`);
  console.log(`FROM: ${fromNumber || 'NOT SET'}`);
  console.log(`MESSAGE:\n${msg}`);
  console.log('=========================================\n');
  return true;
};

module.exports = { sendEmergencySMS };
