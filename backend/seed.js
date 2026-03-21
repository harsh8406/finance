const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Expense = require('./models/Expense');
const Budget = require('./models/Budget');

dotenv.config();

const seedData = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  await User.deleteMany({});
  await Expense.deleteMany({});
  await Budget.deleteMany({});

  const user = await User.create({ name: 'Arjun Sharma', email: 'demo@penny.com', password: 'demo1234' });
  console.log('✅ Demo user: demo@penny.com / demo1234');

  await Budget.create({ user: user._id, month: 3, year: 2026, amount: 15000 });

  const today = new Date();
  const d = (n) => { const x = new Date(today); x.setDate(x.getDate() - n); return x; };

  const expenses = [
    { title: 'Grocery Store',  amount: 2400, category: 'food',          date: d(0), note: 'Weekly groceries' },
    { title: 'Metro Card',     amount: 500,  category: 'transport',     date: d(1), note: '' },
    { title: 'Netflix',        amount: 649,  category: 'entertainment', date: d(1), note: 'Monthly subscription' },
    { title: 'Electricity',    amount: 1800, category: 'bills',         date: d(2), note: '' },
    { title: 'Pharmacy',       amount: 320,  category: 'health',        date: d(2), note: 'Vitamins' },
    { title: 'Zomato Dinner',  amount: 450,  category: 'food',          date: d(3), note: '' },
    { title: 'Amazon Order',   amount: 1299, category: 'shopping',      date: d(3), note: 'Books' },
    { title: 'Udemy Course',   amount: 399,  category: 'education',     date: d(4), note: 'React Course' },
    { title: 'Gym Membership', amount: 2000, category: 'health',        date: d(4), note: '' },
    { title: 'Auto Rickshaw',  amount: 180,  category: 'transport',     date: d(5), note: '' },
  ];

  await Expense.insertMany(expenses.map((e) => ({ ...e, user: user._id })));
  console.log(`✅ ${expenses.length} sample expenses seeded`);

  mongoose.disconnect();
  console.log('🎉 Seed complete!');
};

seedData().catch((err) => { console.error(err); process.exit(1); });
