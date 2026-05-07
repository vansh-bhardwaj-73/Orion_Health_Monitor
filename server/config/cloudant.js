// FILE: config/cloudant.js
// Matches SDA pattern: helpers (saveDocument, getAllDocuments, findDocuments),
// index creation, getAllDbs() connection test, CLOUDANT_PASSWORD + CLOUDANT_DB_NAME env vars.

const { CloudantV1 }       = require('@ibm-cloud/cloudant');
const { IamAuthenticator } = require('ibm-cloud-sdk-core'); // ← ibm-cloud-sdk-core (matches SDA)

// ===== VALIDATE ENV =====
if (!process.env.CLOUDANT_URL || !process.env.CLOUDANT_PASSWORD || !process.env.CLOUDANT_DB_NAME) {
  throw new Error('❌ Missing Cloudant env vars: CLOUDANT_URL, CLOUDANT_PASSWORD, CLOUDANT_DB_NAME');
}

// ===== INIT CLIENT =====
const cloudant = new CloudantV1({
  authenticator: new IamAuthenticator({ apikey: process.env.CLOUDANT_PASSWORD }),
  serviceUrl: process.env.CLOUDANT_URL,
});

const DB_NAME = process.env.CLOUDANT_DB_NAME;

// ===== DATABASE SETUP (matches SDA's setupDatabase) =====
const setupDatabase = async () => {
  try {
    console.log('🔄 Connecting to Cloudant...');

    // Test connection with getAllDbs() (matches SDA)
    const dbList = await cloudant.getAllDbs();

    // Check if DB exists, create if not
    if (!dbList.result.includes(DB_NAME)) {
      await cloudant.putDatabase({ db: DB_NAME });
      console.log(`✅ Database "${DB_NAME}" created`);
    } else {
      console.log(`✅ Database "${DB_NAME}" already exists`);
    }

    // Create indexes (matches SDA pattern — safe, ignore "already exists")
    const indexes = [
      { name: 'type-timestamp-index',  index: { fields: ['type', 'createdAt'] } },
      { name: 'type-userId-index',     index: { fields: ['type', 'userId'] } },
      { name: 'type-severity-index',   index: { fields: ['type', 'severity'] } },
    ];

    for (const idx of indexes) {
      try {
        await cloudant.postIndex({ db: DB_NAME, name: idx.name, type: 'json', index: idx.index });
      } catch (err) {
        if (!err.message?.includes('exists')) {
          console.warn(`⚠️ Index issue (${idx.name}):`, err.message);
        }
      }
    }

    console.log('✅ Cloudant connected — indexes ready');

  } catch (error) {
    console.error('❌ Cloudant setup failed:', error.message);
    throw error; // critical — stop server
  }
};

// ===== HELPERS (matches SDA) =====

// Save a document
const saveDocument = async (doc) => {
  try {
    const res = await cloudant.postDocument({ db: DB_NAME, document: doc });
    return res.result;
  } catch (error) {
    console.error('❌ Cloudant save error:', error.message);
    throw error;
  }
};

// Get all documents
const getAllDocuments = async () => {
  try {
    const res = await cloudant.postAllDocs({ db: DB_NAME, includeDocs: true });
    return res.result.rows.map(row => row.doc);
  } catch (error) {
    console.error('❌ Cloudant fetch error:', error.message);
    throw error;
  }
};

// Query documents by selector (matches SDA's findDocuments)
const findDocuments = async (selector, sort = null, limit = 50) => {
  try {
    const res = await cloudant.postFind({
      db: DB_NAME,
      selector,
      sort: sort || undefined,
      limit,
    });
    return res.result.docs;
  } catch (error) {
    console.error('❌ Cloudant query error:', error.message);
    throw error;
  }
};

// Get single document by ID
const getDocument = async (docId) => {
  try {
    const res = await cloudant.getDocument({ db: DB_NAME, docId });
    return res.result;
  } catch (error) {
    console.error('❌ Cloudant getDocument error:', error.message);
    throw error;
  }
};

module.exports = {
  cloudant,
  DB_NAME,
  setupDatabase,
  saveDocument,
  getAllDocuments,
  findDocuments,
  getDocument,
};