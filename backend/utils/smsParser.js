// Parses Indian bank SMS messages and extracts expense data

const BANK_PATTERNS = [
  // SBI
  { pattern: /debited.*?rs\.?\s*([\d,]+\.?\d*)/i, type: 'debit' },
  // HDFC
  { pattern: /rs\.?\s*([\d,]+\.?\d*)\s+debited/i, type: 'debit' },
  // ICICI
  { pattern: /inr\s*([\d,]+\.?\d*)\s+debited/i, type: 'debit' },
  // Axis
  { pattern: /debited\s+inr\s*([\d,]+\.?\d*)/i, type: 'debit' },
  // Kotak
  { pattern: /debit.*?inr\s*([\d,]+\.?\d*)/i, type: 'debit' },
  // Generic UPI
  { pattern: /paid\s+rs\.?\s*([\d,]+\.?\d*)/i, type: 'debit' },
  { pattern: /payment.*?rs\.?\s*([\d,]+\.?\d*)/i, type: 'debit' },
  { pattern: /spent\s+rs\.?\s*([\d,]+\.?\d*)/i, type: 'debit' },
  // Generic amount pattern
  { pattern: /rs\.?\s*([\d,]+\.?\d*)/i, type: 'debit' },
  { pattern: /inr\s*([\d,]+\.?\d*)/i, type: 'debit' },
];

const MERCHANT_PATTERNS = [
  /(?:at|to|towards|for)\s+([A-Z][A-Za-z0-9\s\-&.]+?)(?:\s+on|\s+via|\s+ref|\s+upi|\.|,|$)/i,
  /UPI[:\s]+([A-Za-z0-9\s\-&.@]+?)(?:\s+on|\s+ref|\s+upi|\.|,|$)/i,
  /VPA\s+([A-Za-z0-9\s\-&.@]+?)(?:\s+on|\s+ref|\.|,|$)/i,
];

const CATEGORY_KEYWORDS = {
  food:          ['zomato', 'swiggy', 'dominos', 'pizza', 'burger', 'restaurant', 'cafe', 'food', 'eat', 'hotel', 'kitchen', 'biryani', 'mcdonalds', 'kfc', 'subway', 'starbucks'],
  transport:     ['uber', 'ola', 'rapido', 'metro', 'railway', 'irctc', 'bus', 'auto', 'cab', 'petrol', 'fuel', 'parking', 'toll', 'redbus', 'makemytrip', 'indigo', 'spicejet'],
  shopping:      ['amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'meesho', 'snapdeal', 'mall', 'shop', 'store', 'retail', 'market', 'bazaar', 'reliance', 'dmart'],
  health:        ['pharmacy', 'medical', 'hospital', 'clinic', 'doctor', 'medicine', 'apollo', 'netmeds', 'pharmeasy', 'healthkart', 'gym', 'fitness'],
  entertainment: ['netflix', 'prime', 'hotstar', 'spotify', 'youtube', 'bookmyshow', 'pvr', 'inox', 'cinema', 'movie', 'game', 'steam'],
  bills:         ['electricity', 'water', 'gas', 'wifi', 'broadband', 'airtel', 'jio', 'vodafone', 'bsnl', 'tata', 'bill', 'recharge', 'dth', 'insurance', 'emi'],
  education:     ['udemy', 'coursera', 'byju', 'unacademy', 'school', 'college', 'university', 'course', 'book', 'amazon kindle', 'notion'],
};

function parseAmount(sms) {
  for (const { pattern } of BANK_PATTERNS) {
    const match = sms.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(amount) && amount > 0) return amount;
    }
  }
  return null;
}

function parseMerchant(sms) {
  for (const pattern of MERCHANT_PATTERNS) {
    const match = sms.match(pattern);
    if (match && match[1]) {
      return match[1].trim().replace(/\s+/g, ' ');
    }
  }
  // Try to extract VPA/UPI ID
  const vpaMatch = sms.match(/([a-zA-Z0-9.\-_]+@[a-zA-Z]+)/);
  if (vpaMatch) return vpaMatch[1];
  return 'Unknown Merchant';
}

function detectCategory(sms, merchant) {
  const text = (sms + ' ' + merchant).toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) return category;
  }
  return 'other';
}

function isDebitSMS(sms) {
  const debitKeywords = ['debited', 'debit', 'paid', 'payment', 'spent', 'withdrawn', 'purchase'];
  const creditKeywords = ['credited', 'credit', 'received', 'added', 'refund'];
  const text = sms.toLowerCase();
  const hasDebit = debitKeywords.some(kw => text.includes(kw));
  const hasCredit = creditKeywords.some(kw => text.includes(kw));
  return hasDebit && !hasCredit;
}

function parseSMS(smsText, sender = '') {
  if (!isDebitSMS(smsText)) {
    return { valid: false, reason: 'Not a debit/payment SMS' };
  }
  const amount = parseAmount(smsText);
  if (!amount) {
    return { valid: false, reason: 'Could not extract amount' };
  }
  const merchant = parseMerchant(smsText);
  const category = detectCategory(smsText, merchant);
  const today = new Date().toISOString().slice(0, 10);

  return {
    valid: true,
    title: merchant,
    amount,
    category,
    date: today,
    note: `Auto-detected from SMS${sender ? ' (' + sender + ')' : ''}`,
    rawSMS: smsText,
  };
}

module.exports = { parseSMS };
