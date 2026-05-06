// FILE: services/emergency.service.js

const generateEmergencyResponse = (severity, text) => {
  if (!severity) {
    throw new Error('Severity is required');
  }

  const lowerText = text.toLowerCase();
  
  // Highly specific medical conditions based on keywords
  const getSpecificActions = () => {
    const actions = [];
    
    // Cardiac / Chest
    if (lowerText.includes('chest pain') || lowerText.includes('heart attack')) {
      actions.push('Have the person sit down, rest, and try to keep calm.');
      actions.push('Loosen any tight clothing.');
      actions.push('If they have prescribed nitroglycerin, help them take it.');
      actions.push('If the person becomes unresponsive, begin CPR immediately.');
    }
    
    // Stroke
    if (lowerText.includes('stroke') || lowerText.includes('face drooping') || lowerText.includes('arm weakness') || lowerText.includes('speech')) {
      actions.push('Remember F.A.S.T: Face drooping, Arm weakness, Speech difficulty, Time to call emergency.');
      actions.push('Note the exact time the symptoms started.');
      actions.push('Do not give the person anything to eat or drink.');
    }

    // Snake bite
    if (lowerText.includes('snake bite') || lowerText.includes('bitten by a snake')) {
      actions.push('Keep the person calm and completely still to slow the spread of venom.');
      actions.push('Position the bitten area below the level of the heart if possible.');
      actions.push('Do NOT apply a tourniquet. Do NOT attempt to suck the venom out.');
      actions.push('Remove any rings or tight clothing near the bite area.');
    }

    // Heavy bleeding
    if (lowerText.includes('heavy bleeding') || lowerText.includes('deep cut')) {
      actions.push('Apply direct, firm pressure to the wound with a clean cloth.');
      actions.push('Elevate the injured area above the heart if possible.');
      actions.push('If blood soaks through, add more cloth on top. Do not remove the original cloth.');
    }

    // Anaphylaxis
    if (lowerText.includes('allergic reaction') || lowerText.includes('anaphylaxis')) {
      actions.push('Ask if they carry an epinephrine auto-injector (EpiPen). Help them use it if needed.');
      actions.push('Have the person lie down and elevate their legs.');
      actions.push('Monitor their breathing closely.');
    }

    // Seizure
    if (lowerText.includes('seizure')) {
      actions.push('Ease the person to the floor and clear the area of hard/sharp objects.');
      actions.push('Place something soft and flat under their head.');
      actions.push('Turn them gently onto one side to keep their airway clear.');
      actions.push('Do NOT put anything in their mouth or try to hold them down.');
    }

    return actions;
  };

  switch (severity) {
    case 'critical':
      let criticalActions = [
        'CRITICAL MEDICAL EMERGENCY DETECTED.',
        'Call Emergency Services (112 / 108) immediately.',
      ];
      
      const specificCritical = getSpecificActions();
      if (specificCritical.length > 0) {
        criticalActions = [...criticalActions, ...specificCritical];
      } else {
        criticalActions.push('Ensure the patient is breathing and has a pulse. Begin CPR if necessary.');
      }

      return {
        message: 'CRITICAL EMERGENCY: DISPATCHING HELP.',
        action: criticalActions,
      };

    case 'high':
      let highActions = [
        'High severity health issue. Please seek immediate medical attention.',
        'Do not let the patient drive themselves to the hospital.',
      ];

      const specificHigh = getSpecificActions();
      if (specificHigh.length > 0) {
        highActions = [...highActions, ...specificHigh];
      }

      return {
        message: 'High severity alert logged.',
        action: highActions,
      };

    case 'medium':
      let medActions = [
        'Moderate health issue detected.',
        'Monitor symptoms closely. If they worsen, contact a doctor immediately.',
      ];
      
      const specificMed = getSpecificActions();
      if (specificMed.length > 0) {
        medActions = [...medActions, ...specificMed];
      } else {
        medActions.push('Rest and stay hydrated.');
      }

      return {
        message: 'Moderate alert logged.',
        action: medActions,
      };

    case 'low':
      return {
        message: 'Low severity symptoms.',
        action: [
          'Rest and monitor the situation.',
          'Schedule a check-up with your primary care physician if symptoms persist over 48 hours.',
        ],
      };

    default:
      throw new Error('Invalid severity level');
  }
};

module.exports = {
  generateEmergencyResponse,
};