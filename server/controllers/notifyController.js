// FILE: controllers/notifyController.js
// Matches SDA's notifyController.js pattern exactly:
//   - sendEmergencyAlert: sends WhatsApp + SMS to each contact, per-contact result
//   - Twilio config check before attempting
//   - +91 auto-prefix for Indian numbers
//   - Rich SOS message with India helplines

const twilio = require('twilio');

// ===== SOS EMERGENCY ALERT =====
const sendEmergencyAlert = async (req, res) => {
  try {
    // Check Twilio config
    if (!process.env.TWILIO_SID || !process.env.TWILIO_AUTH_TOKEN) {
      return res.status(503).json({
        success: false,
        error: 'Twilio not configured. Add TWILIO_SID and TWILIO_AUTH_TOKEN to .env'
      });
    }

    const { contacts, location, userName, symptom, severity } = req.body;

    // Validate contacts
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one emergency contact is required'
      });
    }

    // Build location string
    let locationStr = 'Location not available';
    let mapsLink    = '';

    if (location && location.lat && location.lng) {
      mapsLink    = `https://maps.google.com/maps?q=${location.lat},${location.lng}`;
      locationStr = location.address
        ? `${location.address}\n📌 Coordinates: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`
        : `Lat: ${location.lat.toFixed(5)}, Lng: ${location.lng.toFixed(5)}`;
    }

    // Timestamp (IST — matches SDA)
    const timestamp = new Date().toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: true, timeZone: 'Asia/Kolkata'
    });

    // Rich WhatsApp message (matches SDA template style)
    const whatsappBody = [
      `🔴🔴🔴 *ORION EMERGENCY ALERT* 🔴🔴🔴`,
      ``,
      `⚠️ *SEVERITY: ${(severity || 'CRITICAL').toUpperCase()}*`,
      `🕐 *Time:* ${timestamp} IST`,
      `👤 *Person:* ${userName || 'Unknown'}`,
      symptom ? `🩺 *Symptom:* ${symptom}` : '',
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📍 *LIVE LOCATION*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      locationStr,
      mapsLink ? `\n🗺️ *Open in Google Maps:*\n${mapsLink}` : '',
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📞 *EMERGENCY HELPLINES*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `112  → National Emergency`,
      `108  → Ambulance`,
      `101  → Fire Brigade`,
      `100  → Police`,
      `1066 → Poison Control`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `⚡ *IMMEDIATE ACTION REQUIRED*`,
      `This person may need urgent medical help.`,
      `Please contact them or alert nearby authorities.`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `_Sent via Orion Health Monitor_`,
      `_This is an automated emergency alert._`,
    ].filter(line => line !== undefined && line !== null)
     .join('\n').trim();

    // SMS version — strip WhatsApp markdown (matches SDA)
    const smsBody = whatsappBody.replace(/\*/g, '').replace(/_/g, '');

    const client  = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
    const fromWA  = process.env.TWILIO_WHATSAPP || 'whatsapp:+14155238886';
    const fromSMS = process.env.TWILIO_PHONE    || '';
    const results = [];

    for (const contact of contacts) {
      if (!contact.phone) continue;

      // Auto-prefix +91 for Indian numbers (matches SDA)
      let phone = contact.phone.replace(/\s+/g, '');
      if (!phone.startsWith('+')) phone = '+91' + phone;

      const contactResult = { name: contact.name || 'Unknown', phone, whatsapp: null, sms: null };

      // Send WhatsApp
      try {
        const waMsg = await client.messages.create({
          from: fromWA,
          to:   `whatsapp:${phone}`,
          body: whatsappBody,
        });
        contactResult.whatsapp = { success: true, sid: waMsg.sid };
        console.log(`✅ WhatsApp sent to ${contact.name} (${phone}): ${waMsg.sid}`);
      } catch (waErr) {
        contactResult.whatsapp = { success: false, error: waErr.message, code: waErr.code };
        console.warn(`⚠️ WhatsApp failed for ${phone}:`, waErr.message);
      }

      // Send SMS (if phone configured)
      if (fromSMS) {
        try {
          const smsMsg = await client.messages.create({ from: fromSMS, to: phone, body: smsBody });
          contactResult.sms = { success: true, sid: smsMsg.sid };
          console.log(`✅ SMS sent to ${contact.name} (${phone}): ${smsMsg.sid}`);
        } catch (smsErr) {
          contactResult.sms = { success: false, error: smsErr.message, code: smsErr.code };
          console.warn(`⚠️ SMS failed for ${phone}:`, smsErr.message);
        }
      }

      results.push(contactResult);
    }

    const successCount = results.filter(r => r.whatsapp?.success || r.sms?.success).length;

    res.json({
      success: true,
      message: `Alert sent to ${successCount}/${results.length} contacts`,
      results,
    });

  } catch (err) {
    console.error('❌ SOS Alert error:', err.message);

    if (err.code === 20003) {
      return res.status(401).json({
        success: false,
        error: 'Invalid Twilio credentials. Check TWILIO_SID and TWILIO_AUTH_TOKEN'
      });
    }

    res.status(500).json({ success: false, error: err.message || 'Failed to send emergency alert' });
  }
};

module.exports = { sendEmergencyAlert };
