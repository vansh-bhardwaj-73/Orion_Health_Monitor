// FILE: services/classifier.service.js
// Uses the Watson singleton from config/watson.js.
// Uses stateless messaging (correct for one-shot symptom classification).
// WATSON_ASSISTANT_* env var names aligned to SDA convention.

const { getAssistant, getAssistantId, getEnvId } = require('../config/watson');

// ── Keyword fallback rules ────────────────────────────────────────
const RULES = {
  critical: [
    'chest pain', 'heart attack', 'stroke', 'face drooping', 'arm weakness',
    'snake bite', 'unresponsive', 'not breathing', 'heavy bleeding', 'anaphylaxis',
  ],
  high: [
    'breathing difficulty', 'shortness of breath', 'severe allergic reaction',
    'high fever', 'head injury', 'seizure', 'fainted',
  ],
  medium: [
    'fracture', 'broken bone', 'deep cut', 'persistent vomiting', 'severe pain',
  ],
  low: [
    'headache', 'minor cut', 'nausea', 'mild rash', 'fever', 'cough',
  ],
};

const CONFIDENCE_MAP = { critical: 0.9, high: 0.75, medium: 0.6, low: 0.4 };
const PRIORITY       = ['critical', 'high', 'medium', 'low'];

const fallbackClassify = (text) => {
  const input   = text.toLowerCase();
  const matched = { critical: [], high: [], medium: [], low: [] };

  for (const level of PRIORITY) {
    for (const keyword of RULES[level]) {
      if (input.includes(keyword)) matched[level].push(keyword);
    }
  }

  let severity = 'low';
  for (const level of PRIORITY) {
    if (matched[level].length > 0) { severity = level; break; }
  }

  const tags = [...matched.critical, ...matched.high, ...matched.medium, ...matched.low];
  return { severity, confidence: CONFIDENCE_MAP[severity], tags: tags.length ? tags : [severity], source: 'fallback' };
};

// ── Main classifier ───────────────────────────────────────────────
const classifySymptom = async (text) => {
  if (!text || typeof text !== 'string') throw new Error('Valid symptom text is required');

  // Sanitise — Watson rejects tabs / newlines
  const cleanText = text.replace(/[\t\n\r]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

  const assistant   = getAssistant();
  const assistantId = getAssistantId();   // WATSON_ASSISTANT_ID
  const envId       = getEnvId();         // WATSON_ASSISTANT_ENV_ID

  if (assistant && assistantId && envId) {
    try {
      const response = await assistant.messageStateless({
        assistantId,
        environmentId: envId,
        userId: 'orion-classifier',
        input: { message_type: 'text', text: cleanText },
      });

      // Watson New Experience (Actions) — intents are always [].
      // Read severity from the action's text response in output.generic.
      const generic  = response.result.output.generic  || [];
      const entities = response.result.output.entities || [];

      const watsonReply = generic.find(g => g.response_type === 'text');

      if (watsonReply?.text) {
        const replyText = watsonReply.text.toLowerCase();

        let severity = 'low';
        if      (replyText.includes('critical') || replyText.includes('emergency')) severity = 'critical';
        else if (replyText.includes('high'))   severity = 'high';
        else if (replyText.includes('medium')) severity = 'medium';
        else severity = fallbackClassify(text).severity;

        return {
          severity,
          confidence: CONFIDENCE_MAP[severity],
          tags: entities.length ? entities.map(e => e.value) : [severity],
          watsonMessage: watsonReply.text,
          source: 'watson',
        };
      }

      console.warn('Watson returned no text output — using keyword fallback.');
    } catch (error) {
      console.error('Watson classification error:', error.message);
    }
  }

  return fallbackClassify(text);
};

module.exports = { classifySymptom };