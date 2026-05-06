// FILE: services/alert.service.js

const generateAlertMessage = (data) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Valid data object is required');
  }

  const { text, severity, response, location, userName } = data;

  if (!text || !severity || !response || !response.message) {
    throw new Error('Missing required fields for alert generation');
  }

  const locationLink = location && location.mapLink ? location.mapLink : 'Location Not Provided';
  const name = userName || 'Unknown';
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  // Professional Orion SOS message template
  const message =
`🚨 ORION EMERGENCY ALERT 🚨
━━━━━━━━━━━━━━━━━━━━━━
Person: ${name}
Time: ${timestamp}
Severity: ${severity.toUpperCase()}
Symptom: ${text}
━━━━━━━━━━━━━━━━━━━━━━
Advice: ${response.message}
📍 Location: ${locationLink}
━━━━━━━━━━━━━━━━━━━━━━
🆘 Helplines: 112 (Emergency) | 108 (Ambulance)
Powered by Orion Health Monitor`;

  const encodedMessage = encodeURIComponent(message);
  const whatsappLink = `https://wa.me/?text=${encodedMessage}`;

  return {
    message,
    whatsappLink,
  };
};

module.exports = {
  generateAlertMessage,
};