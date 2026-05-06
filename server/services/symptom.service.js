// FILE: services/symptom.service.js
const { createDocument, getAllDocuments } = require('./db.service');

const logSymptom = async (data) => {
  try {
    if (!data || !data.userId) {
      throw new Error('Symptom data with userId is required');
    }

    const symptomDoc = {
      type: 'symptom',
      ...data,
      createdAt: new Date().toISOString(),
    };

    return await createDocument(symptomDoc);
  } catch (error) {
    throw new Error(`Error logging symptom: ${error.message}`);
  }
};

const getUserSymptoms = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const docs = await getAllDocuments();
    return docs.filter(
      doc => doc.type === 'symptom' && doc.userId === userId
    );
  } catch (error) {
    throw new Error(`Error fetching symptoms: ${error.message}`);
  }
};

module.exports = {
  logSymptom,
  getUserSymptoms,
};