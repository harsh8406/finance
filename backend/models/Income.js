const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema({
  user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:  { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 1 },
  source: {
    type: String,
    enum: ['salary', 'freelance', 'business', 'investment', 'gift', 'refund', 'other'],
    default: 'other',
  },
  date:   { type: Date, required: true, default: Date.now },
  note:   { type: String, trim: true, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Income', incomeSchema);