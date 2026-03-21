# 💰 Penny Finance — Personal Finance Tracker

Full-stack app: **React + Node.js + Express + MongoDB**

---

## 📁 File Structure

```
penny-finance/
├── package.json                   ← run both frontend + backend together
├── backend/
│   ├── package.json
│   ├── .env.example               ← copy to .env and fill in values
│   ├── server.js                  ← Express entry point
│   ├── seed.js                    ← seed demo data
│   ├── middleware/
│   │   └── auth.js                ← JWT auth middleware
│   ├── models/
│   │   ├── User.js
│   │   ├── Expense.js
│   │   └── Budget.js
│   └── routes/
│       ├── auth.js                ← register / login / me
│       ├── expenses.js            ← CRUD + analytics
│       └── budget.js              ← get / update monthly budget
└── frontend/
    ├── package.json
    ├── .env.example
    ├── public/
    │   └── index.html
    └── src/
        ├── index.js
        ├── App.js                 ← theme state (dark/light)
        ├── context/
        │   └── AuthContext.js     ← global auth state
        ├── utils/
        │   └── api.js             ← axios instance with JWT
        └── pages/
            ├── AuthPage.js        ← login + register
            └── Dashboard.js       ← all 4 views
```

---

## 🚀 Setup & Run

### 1. Install dependencies
```bash
npm install
npm run install-all
```

### 2. Configure backend environment
```bash
cd backend
copy .env.example .env
```
Edit `backend/.env`:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/penny-finance
JWT_SECRET=your_secret_key_here
NODE_ENV=development
```

### 3. Configure frontend environment
```bash
cd frontend
copy .env.example .env
```
`frontend/.env` (default works for local):
```
REACT_APP_API_URL=http://localhost:5000/api
```

### 4. Start MongoDB
```bash
net start MongoDB
```

### 5. Seed demo data (optional)
```bash
npm run seed
```
Demo login: **demo@penny.com** / **demo1234**

### 6. Run the app
```bash
npm run dev
```
- Frontend → http://localhost:3000
- Backend  → http://localhost:5000

---

## ✅ Features

- 🔐 Register / Login with JWT authentication
- 👁 Password show/hide toggle
- 🌙 Dark / Light mode (remembered across sessions)
- 📊 Dashboard with stats, donut charts, recent transactions
- 💸 Add / Edit / Delete expenses
- 📅 Date restricted to today and past 5 days only
- ⚠️ Inline error if amount is 0 or negative
- 🔍 Filter expenses by category
- 📈 Analytics with category breakdown
- 🎯 Budget tracker with slider (min ₹1,000)
- 💾 All data saved to MongoDB per user
