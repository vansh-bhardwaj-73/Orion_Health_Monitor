// FILE: routes/user.routes.js
const express = require('express');
const router = express.Router();
const { createUser, getUserById } = require('../services/user.service');

router.post('/create', async (req, res) => {
  try {
    const result = await createUser(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await getUserById(req.params.id);
    res.status(200).json(user);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

module.exports = router;