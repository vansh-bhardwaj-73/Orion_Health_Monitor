// FILE: routes/symptom.routes.js
const express = require('express');
const router = express.Router();
const { logSymptom, getUserSymptoms } = require('../services/symptom.service');
const { classifySymptom } = require('../services/classifier.service');
const { generateEmergencyResponse } = require('../services/emergency.service');
const { generateLocationLink } = require('../services/location.service');
const { generateAlertMessage } = require('../services/alert.service');
const { sendEmergencySMS } = require('../services/sms.service');
const { getUserById } = require('../services/user.service');

router.post('/log', async (req, res) => {
  try {
    const { text, userId, lat, lng, isSOS, userName, emergencyContacts, ...rest } = req.body;

    if (!text || !userId) {
      return res.status(400).json({ error: 'text and userId are required' });
    }

    // Step 1: Classify
    let classification;
    if (isSOS) {
      classification = { severity: 'critical', confidence: 1.0, tags: ['SOS'] };
    } else {
      classification = await classifySymptom(text);
    }

    // Step 2: Generate first-aid response
    const response = generateEmergencyResponse(classification.severity, text);

    let location;
    let alert;
    let smsSent = false;
    let whatsappSent = false;

    // Step 3: For critical — generate location link and dispatch alerts
    if (classification.severity === 'critical') {
      if (lat !== undefined && lng !== undefined) {
        location = generateLocationLink(lat, lng);
      } else {
        location = { mapLink: 'Location Not Provided' };
      }

      alert = generateAlertMessage({
        text,
        severity: classification.severity,
        response,
        location,
        userName: userName || 'Orion User',
      });

      // Step 4: Send to contacts
      const contacts = emergencyContacts && emergencyContacts.length > 0
        ? emergencyContacts
        : [];

      // Also try to pull from user profile as fallback
      let profileContact = null;
      try {
        const user = await getUserById(userId);
        if (user && user.emergencyContact) profileContact = user.emergencyContact;
      } catch (e) { /* no profile */ }

      if (contacts.length > 0) {
        for (const c of contacts) {
          if (!c.phone) continue;
          // Try WhatsApp first, then fallback to SMS
          whatsappSent = await sendEmergencySMS(c.phone, alert.message, true);
          if (!whatsappSent) {
            smsSent = await sendEmergencySMS(c.phone, alert.message, false);
          }
        }
      } else if (profileContact) {
        whatsappSent = await sendEmergencySMS(profileContact, alert.message, true);
        if (!whatsappSent) {
          smsSent = await sendEmergencySMS(profileContact, alert.message, false);
        }
      }
    }

    // Step 5: Store in Cloudant
    const symptomData = {
      userId,
      text,
      severity: classification.severity,
      confidence: classification.confidence,
      tags: classification.tags,
      source: classification.source || 'fallback',
      response,
      ...(location && { location }),
      ...(alert && { alert }),
      smsSent,
      whatsappSent,
      ...rest,
    };

    const savedResult = await logSymptom(symptomData);

    // Return the full enriched object (not just Cloudant {ok,id,rev})
    // so the frontend can read severity, response, tags, etc.
    const fullResult = {
      ...symptomData,
      _id: savedResult.id || savedResult._id,
      _rev: savedResult.rev || savedResult._rev,
      ok: savedResult.ok,
    };

    // Pass back alert URL for frontend WhatsApp button
    if (alert && alert.whatsappLink) {
      fullResult.whatsappLink = alert.whatsappLink;
    }

    res.status(201).json(fullResult);
  } catch (error) {
    console.error('Symptom log error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

router.get('/:userId', async (req, res) => {
  try {
    const symptoms = await getUserSymptoms(req.params.userId);
    res.status(200).json(symptoms);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;