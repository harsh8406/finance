const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0.01 },
  category: {
    type: String,
    required: true,
    enum: ['food', 'transport', 'shopping', 'health', 'entertainment', 'bills', 'education', 'other'],
    default: 'other',
  },
  date: { type: Date, required: true, default: Date.now },
  note: { type: String, trim: true, default: '' },
  createdAt: { type: Date, default: Date.now },
});

expenseSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
