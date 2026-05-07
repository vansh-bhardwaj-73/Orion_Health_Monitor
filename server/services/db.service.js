// FILE: services/db.service.js
// Thin wrapper — delegates to the helpers in config/cloudant.js
// (matches SDA's pattern of keeping DB helpers in config/cloudant.js)

const { saveDocument, getAllDocuments, findDocuments, getDocument } = require('../config/cloudant');

const createDocument = async (doc) => {
  try {
    return await saveDocument(doc);
  } catch (error) {
    throw new Error(`Error creating document: ${error.message}`);
  }
};

const getDocuments = async () => {
  try {
    return await getAllDocuments();
  } catch (error) {
    throw new Error(`Error fetching documents: ${error.message}`);
  }
};

const queryDocuments = async (selector, sort = null, limit = 50) => {
  try {
    return await findDocuments(selector, sort, limit);
  } catch (error) {
    throw new Error(`Error querying documents: ${error.message}`);
  }
};

const getDocumentById = async (id) => {
  try {
    return await getDocument(id);
  } catch (error) {
    throw new Error(`Error fetching document: ${error.message}`);
  }
};

module.exports = {
  createDocument,
  getAllDocuments: getDocuments,
  queryDocuments,
  getDocumentById,
};