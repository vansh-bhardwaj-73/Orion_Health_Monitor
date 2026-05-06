// FILE: services/classifier.service.js
const AssistantV2 = require('ibm-watson/assistant/v2');
const { IamAuthenticator } = require('ibm-watson/auth');

const RULES = {
  critical: [
    'chest pain', 'heart attack', 'stroke', 'face drooping', 'arm weakness',
    'snake bite', 'unresponsive', 'not breathing', 'heavy bleeding', 'anaphylaxis'
  ],
  high: [
    'breathing difficulty', 'shortness of breath', 'severe allergic reaction',
    'high fever', 'head injury', 'seizure', 'fainted'
  ],
  medium: [
    'fracture', 'broken bone', 'deep cut', 'persistent vomiting', 'severe pain'
  ],
  low: [
    'headache', 'minor cut', 'nausea', 'mild rash', 'fever', 'cough'
  ],
};

const CONFIDENCE_MAP = {
  critical: 0.9, high: 0.75, medium: 0.6, low: 0.4,
};

const PRIORITY = ['critical', 'high', 'medium', 'low'];

let assistant = null;
if (process.env.WATSON_API_KEY && process.env.WATSON_URL) {
  try {
    assistant = new AssistantV2({
      version: '2023-06-15',
      authenticator: new IamAuthenticator({
        apikey: process.env.WATSON_API_KEY,
      }),
      serviceUrl: process.env.WATSON_URL,
    });
  } catch (error) {
    console.error('Failed to initialize Watson Assistant:', error.message);
  }
}

const fallbackClassify = (text) => {
  const input = text.toLowerCase();
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
  return { severity, confidence: CONFIDENCE_MAP[severity], tags, source: 'fallback' };
};

const classifySymptom = async (text) => {
  if (!text || typeof text !== 'string') {
    throw new Error('Valid symptom text is required');
  }

  // Watson rejects text with tabs, newlines, or carriage returns — strip them
  const cleanText = text.replace(/[\t\n\r]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

  if (assistant && process.env.WATSON_ENVIRONMENT_ID) {
    try {
      const response = await assistant.messageStateless({
        assistantId:   process.env.WATSON_ASSISTANT_ID,
        environmentId: process.env.WATSON_ENVIRONMENT_ID,
        userId:        'orion-classifier',
        input: {
          message_type: 'text',
          text: cleanText,
        },
      });

      // NOTE: Watson New Experience (Actions) does NOT return output.intents —
      // that field is always [] in the Actions model. Instead, read the text
      // response from output.generic, which is what your Watson action sends back.
      const generic = response.result.output.generic || [];
      const entities = response.result.output.entities || [];

      const watsonReply = generic.find(g => g.response_type === 'text');

      if (watsonReply && watsonReply.text) {
        const replyText = watsonReply.text.toLowerCase();

        // Map the Watson action's text response to a severity level.
        // Your Watson action should return a response containing one of:
        // "critical", "emergency", "high", "medium", or "low".
        let severity = 'low';
        if (replyText.includes('critical') || replyText.includes('emergency')) severity = 'critical';
        else if (replyText.includes('high'))   severity = 'high';
        else if (replyText.includes('medium')) severity = 'medium';
        else if (replyText.includes('low'))    severity = 'low';
        else {
          // Watson replied but didn't include a recognisable severity word —
          // fall back to keyword matching on the original text.
          severity = fallbackClassify(text).severity;
        }

        const tags = entities.map(e => e.value);

        return {
          severity,
          confidence: CONFIDENCE_MAP[severity],
          tags: tags.length > 0 ? tags : [severity],
          watsonMessage: watsonReply.text,
          source: 'watson',
        };
      }

      // Watson connected but returned no generic text — use keyword fallback.
      console.log('Watson responded with no text output, using keyword fallback.');
    } catch (error) {
      console.error('Watson classification error:', error.message);
    }
  }

  // Fallback to internal keyword mapping if Watson is unavailable or yields no output.
  return fallbackClassify(text);
};

module.exports = {
  classifySymptom,
};