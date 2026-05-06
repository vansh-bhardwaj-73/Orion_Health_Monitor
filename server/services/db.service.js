// FILE: services/db.service.js
const { getClient, getDbName } = require('../config/cloudant');

const createDocument = async (doc) => {
  try {
    const client = getClient();
    const db = getDbName();

    const response = await client.postDocument({
      db,
      document: doc,
    });

    return response.result;
  } catch (error) {
    throw new Error(`Error creating document: ${error.message}`);
  }
};

const getAllDocuments = async () => {
  try {
    const client = getClient();
    const db = getDbName();

    const response = await client.postAllDocs({
      db,
      includeDocs: true,
    });

    return response.result.rows.map(row => row.doc);
  } catch (error) {
    throw new Error(`Error fetching documents: ${error.message}`);
  }
};

module.exports = {
  createDocument,
  getAllDocuments,
};