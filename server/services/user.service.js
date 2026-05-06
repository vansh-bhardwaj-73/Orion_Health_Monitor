// FILE: services/user.service.js
const { createDocument, getAllDocuments } = require('./db.service');

const createUser = async (data) => {
  try {
    if (!data || Object.keys(data).length === 0) {
      throw new Error('User data is required');
    }

    const userDoc = {
      type: 'user',
      ...data,
      createdAt: new Date().toISOString(),
    };

    return await createDocument(userDoc);
  } catch (error) {
    throw new Error(`Error creating user: ${error.message}`);
  }
};

const getUserById = async (id) => {
  try {
    if (!id) {
      throw new Error('User ID is required');
    }

    const docs = await getAllDocuments();
    const user = docs.find(doc => doc.type === 'user' && doc._id === id);

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  } catch (error) {
    throw new Error(`Error fetching user: ${error.message}`);
  }
};

module.exports = {
  createUser,
  getUserById,
};