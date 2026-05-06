// FILE: routes/test.routes.js
const express = require('express');
const router = express.Router();
const { createDocument, getAllDocuments } = require('../services/db.service');

router.post('/add', async (req, res) => {
  try {
    const data = req.body;

    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Request body cannot be empty' });
    }

    const result = await createDocument(data);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/all', async (req, res) => {
  try {
    const docs = await getAllDocuments();
    res.status(200).json(docs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;