const express = require('express');
const Budget = require('../models/Budget');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/budget
router.get('/', auth, async (req, res) => {
  try {
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query;
    let budget = await Budget.findOne({ user: req.user._id, month: Number(month), year: Number(year) });
    if (!budget) {
      budget = await Budget.create({ user: req.user._id, month: Number(month), year: Number(year), amount: 15000 });
    }
    res.json(budget);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/budget
router.put('/', auth, async (req, res) => {
  try {
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear(), amount } = req.body;
    if (amount < 1000) return res.status(400).json({ message: 'Budget must be at least ₹1,000' });
    const budget = await Budget.findOneAndUpdate(
      { user: req.user._id, month: Number(month), year: Number(year) },
      { amount, updatedAt: Date.now() },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(budget);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
