const express = require('express');
const { body, validationResult } = require('express-validator');
const Expense = require('../models/Expense');
const auth = require('../middleware/auth');

const router = express.Router();

// ── Auto-category helper for SMS imports ──────────────────────────────────────
function autoCategory(title) {
  const t = title.toLowerCase();
  if (/zomato|swiggy|dominos|pizza|burger|cafe|restaurant|food|biryani|hotel/.test(t)) return 'food';
  if (/uber|ola|rapido|metro|bus|train|fuel|petrol|diesel|irctc|flight|airways/.test(t)) return 'transport';
  if (/amazon|flipkart|myntra|nykaa|ajio|shopping|mall|store|mart/.test(t)) return 'shopping';
  if (/pharma|pharmacy|hospital|clinic|doctor|health|apollo|medplus/.test(t)) return 'health';
  if (/netflix|spotify|prime|hotstar|bookmyshow|cinema|theatre|game|entertainment/.test(t)) return 'entertainment';
  if (/electricity|water|gas|internet|broadband|recharge|bill|postpaid/.test(t)) return 'bills';
  if (/udemy|coursera|school|college|fees|tuition|education/.test(t)) return 'education';
  return 'other';
}

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
    body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least ₹1'),
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
    if (req.body.date) {
      const today = new Date(); today.setHours(23, 59, 59, 999);
      const minAllowed = new Date(); minAllowed.setDate(minAllowed.getDate() - 5); minAllowed.setHours(0, 0, 0, 0);
      const expDate = new Date(req.body.date);
      if (expDate > today || expDate < minAllowed) {
        return res.status(400).json({ message: 'Date must be within the last 5 days. Future dates are not allowed.' });
      }
    }
    if (req.body.amount !== undefined && req.body.amount < 1) {
      return res.status(400).json({ message: 'Amount must be at least ₹1.' });
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

// POST /api/expenses/sms-import
router.post('/sms-import', auth, async (req, res) => {
  try {
    const { smsBody, smsSource, title: directTitle, amount: directAmount, date: directDate } = req.body;

    // Block OTPs
    if (smsBody) {
      const otpKeywords = ['otp', 'one time', 'password', 'do not share', 'verification'];
      if (otpKeywords.some(k => smsBody.toLowerCase().includes(k))) {
        return res.status(400).json({ message: 'OTP message ignored' });
      }
    }

    let title, amount;

    if (smsBody && smsBody.trim().length > 0) {
      // MacroDroid path — parse full SMS text
      const amountPatterns = [
        /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
        /(?:debited|paid|spent)\s+(?:with\s+)?(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
        /([\d,]+(?:\.\d{1,2})?)\s*(?:Rs\.?|INR|₹)/i,
      ];

      let amountMatch = null;
      for (const pattern of amountPatterns) {
        amountMatch = smsBody.match(pattern);
        if (amountMatch) break;
      }
      amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;
      if (amount < 1) return res.status(400).json({ message: 'Could not parse amount from SMS', smsBody });

      const merchantMatch = smsBody.match(/(?:at|to|At|To)\s+([A-Za-z0-9 &'./-]{3,40})/);
      title = merchantMatch
        ? merchantMatch[1].trim().replace(/\s+/g, ' ')
        : (smsSource || 'Payment');

    } else if (directTitle && directAmount) {
      // Manual/test path — title and amount sent directly
      title = directTitle;
      amount = parseFloat(directAmount);
      if (amount < 1) return res.status(400).json({ message: 'Amount must be at least ₹1' });

    } else {
      return res.status(400).json({ message: 'Please provide either smsBody or title+amount' });
    }

    const category = autoCategory(title);
    const expDate = directDate ? new Date(directDate) : new Date();

    const expense = await Expense.create({
      user: req.user._id,
      title,
      amount,
      category,
      date: expDate,
      note: `Auto-imported from ${smsSource || 'SMS'}`,
    });

    res.status(201).json({ expense, category });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;