const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const User = require('../models/User');
const { parseSMS } = require('../utils/smsParser');

// Store pending SMS expenses in memory (keyed by userId)
// In production you'd use Redis or a DB collection
const pendingExpenses = {};

// POST /api/sms/incoming
// Called by Android SMS Forwarder app
// Body: { phone, sms, sender, apiKey }
router.post('/incoming', async (req, res) => {
  try {
    const { sms, sender, apiKey, phone } = req.body;

    if (!sms) return res.status(400).json({ message: 'SMS text required' });

    // Find user by apiKey (we'll store it on User model)
    const user = await User.findOne({ smsApiKey: apiKey });
    if (!user) {
      return res.status(401).json({ message: 'Invalid API key. Get your key from Settings in Penny Finance.' });
    }

    const parsed = parseSMS(sms, sender);

    if (!parsed.valid) {
      return res.json({ received: true, action: 'ignored', reason: parsed.reason });
    }

    // Store as pending — user reviews on website before it's saved
    if (!pendingExpenses[user._id]) pendingExpenses[user._id] = [];

    const pendingItem = {
      id: Date.now().toString(),
      ...parsed,
      userId: user._id.toString(),
      receivedAt: new Date().toISOString(),
    };

    pendingExpenses[user._id].push(pendingItem);

    console.log(`📱 SMS received for ${user.email}: ₹${parsed.amount} at ${parsed.title}`);

    res.json({
      received: true,
      action: 'pending_review',
      expense: {
        title: parsed.title,
        amount: parsed.amount,
        category: parsed.category,
      },
    });
  } catch (err) {
    console.error('SMS parse error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/sms/pending
// Frontend polls this to get pending SMS expenses
router.get('/pending', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token' });

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    const userId = decoded.id;

    const pending = pendingExpenses[userId] || [];
    res.json(pending);
  } catch (err) {
    res.status(401).json({ message: 'Unauthorized' });
  }
});

// POST /api/sms/approve/:id
// User approves a pending SMS expense → saves to DB
router.post('/approve/:id', async (req, res) => {
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(req.headers.authorization.split(' ')[1], process.env.JWT_SECRET);
    const userId = decoded.id;

    const pending = pendingExpenses[userId] || [];
    const idx = pending.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Pending expense not found' });

    const item = pending[idx];
    const { title, amount, category, date, note } = { ...item, ...req.body };

    const expense = await Expense.create({
      user: userId,
      title: title || item.title,
      amount: Number(amount || item.amount),
      category: category || item.category,
      date: date || item.date,
      note: note || item.note,
    });

    // Remove from pending
    pendingExpenses[userId].splice(idx, 1);

    res.json({ message: 'Expense saved', expense });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/sms/dismiss/:id
// User dismisses a pending SMS expense
router.delete('/dismiss/:id', async (req, res) => {
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(req.headers.authorization.split(' ')[1], process.env.JWT_SECRET);
    const userId = decoded.id;

    const pending = pendingExpenses[userId] || [];
    const idx = pending.findIndex(p => p.id === req.params.id);
    if (idx !== -1) pendingExpenses[userId].splice(idx, 1);

    res.json({ message: 'Dismissed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Export pendingExpenses so server can access it
module.exports = router;
module.exports.pendingExpenses = pendingExpenses;
