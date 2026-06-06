const express = require('express');
const router = express.Router();
const { aiAssistantChat } = require('../services/aiService');

// POST /assistant - AI Shopping Assistant Chat
router.post('/', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ message: 'Invalid request: messages array is required' });
  }

  try {
    const result = await aiAssistantChat(messages);
    return res.json(result);
  } catch (err) {
    console.error('AI Assistant API error:', err);
    return res.status(500).json({ message: 'Internal server error processing AI assistant query' });
  }
});

module.exports = router;
