// FILE: config/cloudant.js
const { CloudantV1 } = require('@ibm-cloud/cloudant');
const { IamAuthenticator } = require('ibm-cloud-sdk-core');

let cloudant;
let dbName = process.env.CLOUDANT_DB;

const initCloudant = async () => {
  try {
    // Use the constructor directly — newInstance() is designed for
    // auto-reading IBM_CLOUD_* env vars, not manually passed options.
    cloudant = new CloudantV1({
      authenticator: new IamAuthenticator({
        apikey: process.env.CLOUDANT_APIKEY,
      }),
      serviceUrl: process.env.CLOUDANT_URL,
    });

    // Check if DB exists, create if not
    try {
      await cloudant.getDatabaseInformation({ db: dbName });
      console.log('Cloudant connected -- DB "' + dbName + '" ready');
    } catch (err) {
      if (err.status === 404) {
        await cloudant.putDatabase({ db: dbName });
        console.log('Cloudant connected -- DB "' + dbName + '" created');
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.error('Cloudant initialization failed:', error.message);
    if (error.message.includes('401') || error.message.includes('403')) {
      console.error('  -> API key is invalid or expired. Regenerate on IBM Cloud.');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('  -> Cannot reach IBM Cloud. Check internet connection.');
    }
    throw error;
  }
};

const getClient = () => {
  if (!cloudant) {
    throw new Error('Cloudant not initialized. Did initCloudant() run successfully?');
  }
  return cloudant;
};

const getDbName = () => dbName;

module.exports = {
  initCloudant,
  getClient,
  getDbName,
};