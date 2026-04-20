const express = require('express');
const { body, validationResult } = require('express-validator');
const Income = require('../models/Income');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/income
router.get('/', auth, async (req, res) => {
  try {
    const { month, year } = req.query;
    const filter = { user: req.user._id };
    if (month && year) {
      filter.date = {
        $gte: new Date(year, month - 1, 1),
        $lte: new Date(year, month, 0, 23, 59, 59),
      };
    }
    const incomes = await Income.find(filter).sort({ date: -1 });
    res.json(incomes);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/income
router.post('/', auth,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least ₹1'),
    body('source').isIn(['salary', 'freelance', 'business', 'investment', 'gift', 'refund', 'other']),
    body('date').isISO8601().withMessage('Valid date is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const { title, amount, source, date, note } = req.body;

      const today = new Date(); today.setHours(23, 59, 59, 999);
      const minAllowed = new Date(); minAllowed.setDate(minAllowed.getDate() - 5); minAllowed.setHours(0, 0, 0, 0);
      const incDate = new Date(date);
      if (incDate > today || incDate < minAllowed) {
        return res.status(400).json({ message: 'Date must be within the last 5 days.' });
      }

      const income = await Income.create({ user: req.user._id, title, amount, source, date, note });
      res.status(201).json(income);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

// PUT /api/income/:id
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.body.date) {
      const today = new Date(); today.setHours(23, 59, 59, 999);
      const minAllowed = new Date(); minAllowed.setDate(minAllowed.getDate() - 5); minAllowed.setHours(0, 0, 0, 0);
      const incDate = new Date(req.body.date);
      if (incDate > today || incDate < minAllowed) {
        return res.status(400).json({ message: 'Date must be within the last 5 days.' });
      }
    }
    if (req.body.amount !== undefined && req.body.amount < 1) {
      return res.status(400).json({ message: 'Amount must be at least ₹1.' });
    }
    const income = await Income.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { ...req.body },
      { new: true, runValidators: true }
    );
    if (!income) return res.status(404).json({ message: 'Income not found' });
    res.json(income);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/income/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const income = await Income.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!income) return res.status(404).json({ message: 'Income not found' });
    res.json({ message: 'Income deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;