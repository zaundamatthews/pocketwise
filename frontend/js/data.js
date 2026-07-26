
const USE_MOCK_DATA = true;
const API_BASE = 'http://localhost:5000/api';

let mockTransactions = [
  { id: 1, type: 'income',  amount: 120000, category: 'Salary',         description: 'Monthly salary', date: '2025-05-01', icon: '💰' },
  { id: 2, type: 'expense', amount: 6000,   category: 'Food & Drinks',  description: 'Groceries',       date: '2025-05-17', icon: '🍔' },
  { id: 3, type: 'expense', amount: 2000,   category: 'Transport',      description: 'Minibus fares',   date: '2025-05-18', icon: '🚌' },
  { id: 4, type: 'expense', amount: 15000,  category: 'Education',      description: 'Books',           date: '2025-05-19', icon: '📚' },
  { id: 5, type: 'expense', amount: 6000,   category: 'Food & Drinks',  description: 'Dinner out',       date: '2025-05-20', icon: '🍔' },
  { id: 6, type: 'expense', amount: 2500,   category: 'Others',         description: 'Airtime',          date: '2025-05-21', icon: '📱' },
  { id: 7, type: 'expense', amount: 12500,  category: 'Accommodation',  description: 'Room contribution', date: '2025-05-22', icon: '🏠' },
  { id: 8, type: 'expense', amount: 7500,   category: 'Entertainment',  description: 'Weekend outing',    date: '2025-05-23', icon: '🎉' },
];

// Pre-computed mock AI insight response 

const mockInsight = {
  score: 72,
  summaryLine: "Good job! You're managing your finances well.",
  explanation: "You spent 36% of your income on Food & Drinks this month — noticeably higher than your usual average, largely from weekend dining.",
  tips: [
    { icon: '🍽️', title: 'Reduce Food Expenses', body: 'You spent 36% of your income on food. Consider cooking more meals at home.' },
    { icon: '💚', title: 'Great Savings Habit', body: 'Your savings rate is 34.6%. Keep it up! Aim for 40%.' },
    { icon: '📌', title: 'Track Small Expenses', body: 'Small daily expenses can add up. Keep tracking them consistently.' },
  ]
};
