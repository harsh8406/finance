const express = require('express');
const { body, validationResult } = require('express-validator');
const Expense = require('../models/Expense');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/expenses
router.get('/', auth, async (req, res) => {
  try {
    const { category, month, year, sortBy = 'date', order = 'desc' } = req.query;
    const filter = { user: req.user._id };
    if (category && category !== 'all') filter.category = category;
    if (month && year) {
      filter.date = {
        $gte: new Date(year, month - 1, 1),
        $lte: new Date(year, month, 0, 23, 59, 59),
      };
    }
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortField = sortBy === 'amount' ? 'amount' : sortBy === 'title' ? 'title' : 'date';
    const expenses = await Expense.find(filter).sort({ [sortField]: sortOrder });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/expenses/analytics
router.get('/analytics', auth, async (req, res) => {
  try {
    const { month, year } = req.query;
    const filter = { user: req.user._id };
    if (month && year) {
      filter.date = {
        $gte: new Date(year, month - 1, 1),
        $lte: new Date(year, month, 0, 23, 59, 59),
      };
    }
    const expenses = await Expense.find(filter);
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const byCategory = {};
    expenses.forEach((e) => {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    });
    const sorted = [...expenses].sort((a, b) => b.amount - a.amount);
    res.json({
      total,
      count: expenses.length,
      byCategory,
      highest: sorted[0] || null,
      lowest: sorted[sorted.length - 1] || null,
      avgPerDay: month ? +(total / new Date(year, month, 0).getDate()).toFixed(2) : 0,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/expenses/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, user: req.user._id });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json(expense);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/expenses
router.post('/', auth,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('category').isIn(['food', 'transport', 'shopping', 'health', 'entertainment', 'bills', 'education', 'other']),
    body('date').isISO8601().withMessage('Valid date is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const { title, amount, category, date, note } = req.body;

      // Date restriction: only today and past 5 days allowed
      const today = new Date(); today.setHours(23, 59, 59, 999);
      const minAllowed = new Date(); minAllowed.setDate(minAllowed.getDate() - 5); minAllowed.setHours(0, 0, 0, 0);
      const expDate = new Date(date);
      if (expDate > today || expDate < minAllowed) {
        return res.status(400).json({ message: 'Date must be within the last 5 days. Future dates are not allowed.' });
      }

      const expense = await Expense.create({ user: req.user._id, title, amount, category, date, note });
      res.status(201).json(expense);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

// PUT /api/expenses/:id
router.put('/:id', auth, async (req, res) => {
  try {
    // Date restriction on edit too
    if (req.body.date) {
      const today = new Date(); today.setHours(23, 59, 59, 999);
      const minAllowed = new Date(); minAllowed.setDate(minAllowed.getDate() - 5); minAllowed.setHours(0, 0, 0, 0);
      const expDate = new Date(req.body.date);
      if (expDate > today || expDate < minAllowed) {
        return res.status(400).json({ message: 'Date must be within the last 5 days. Future dates are not allowed.' });
      }
    }
    if (req.body.amount !== undefined && req.body.amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0.' });
    }
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { ...req.body },
      { new: true, runValidators: true }
    );
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json(expense);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
