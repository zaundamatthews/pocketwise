// PocketWise AI — Dashboard App Logic

let categoryChartInstance = null;
let trendChartInstance = null;

const categoryColors = {
  'Food & Drinks': '#16a34a',
  'Transport': '#3f6bb0',
  'Accommodation': '#8b5cf6',
  'Education': '#e08a2e',
  'Entertainment': '#e0455b',
  'Others': '#606979',
};

// ---------- View switching (sidebar nav) ----------
function switchView(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${viewName}`).classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`.nav-item[data-view="${viewName}"]`)?.classList.add('active');

  const titles = {
    dashboard: ['Dashboard', "Here's your financial overview."],
    transactions: ['Transactions', 'Add and review your income and expenses.'],
    analytics: ['Analytics', 'Understand your spending trends.'],
    'ai-advice': ['AI Advice', 'Personalized coaching based on your spending.'],
  };
  document.getElementById('page-title').textContent = titles[viewName][0];
  document.getElementById('page-subtitle').textContent = titles[viewName][1];

  if (viewName === 'analytics') renderTrendChart();
  if (viewName === 'ai-advice') loadInsights();
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    switchView(item.dataset.view);
  });
});

// ---------- Auth helper ----------
// Attach the real JWT token (stored at login) to every protected request.
function authHeaders() {
  const token = localStorage.getItem('pw_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// ---------- Data fetching ----------
async function fetchTransactions() {
  if (USE_MOCK_DATA)  {
   return  mockTransactions 
    };
  
  try {
    const response = await fetch(`${API_BASE}/transactions`, {
      headers: {
        ...authHeaders(),
      },
    });
    const data = await response.json();

    if(response.status === 401) {
      localStorage.removeItem('pw_token');
      localStorage.removeItem('pw_user_name');
      window.location.href = 'login.html';
      return [];
    }
    if(!response.ok) {
      throw new Error(data.message || 'Unable to load transactions');
    }

    const transactions =
      data.transactions ||
      data.transaction ||
      data.data ||
      data;

    return Array.isArray(transactions) ? transactions : []
  } catch (error) {
    console.error('Fetch transactions error:', error);
    return [];
  }
}

async function fetchInsights() {
  if (USE_MOCK_DATA) return mockInsight;
  const res = await fetch(`${API_BASE}/insights/generate`, {
    method: 'POST',
    headers: { ...authHeaders() },
  });
  if (res.status === 401) {
    window.location.href = 'login.html';
    return mockInsight;
  }
  return res.json();
}

function computeStats(transactions = []) {
  const income = transactions
    .filter(transaction => transaction.type === 'income')
    .reduce(
      (total, transaction) => total + Number(transaction.amount),
      0
    );

  const expenses = transactions
    .filter(transaction => transaction.type === 'expense')
    .reduce(
      (total, transaction) => total + Number(transaction.amount),
      0
    );

  const balance = income - expenses;

  const savingsRate =
    income > 0
      ? ((balance / income) * 100).toFixed(1)
      : 0;

  return {
    income,
    expenses,
    balance,
    savingsRate,
  };
}

function formatMK(amount) {
  return `MK${Number(amount).toLocaleString('en-MW')}`;
}
function renderStats(transactions) {
  const { income, expenses, balance, savingsRate } = computeStats(transactions);
  document.getElementById('stat-income').textContent = formatMK(income);
  document.getElementById('stat-expenses').textContent = formatMK(expenses);
  document.getElementById('stat-balance').textContent = formatMK(balance);
  document.getElementById('stat-savings').textContent = savingsRate + '%';
}

// ---------- Transaction lists ----------
function txRowHTML(t) {
  const sign = t.type === 'income' ? '+' : '-';
  const transactionDate = t.date || t.createdAt;

  const formattedDate = transactionDate 
      ? new Date(transactionDate).toLocaleDateString() : 'No date';
  return `
    <div class="tx-row">
      <div class="tx-left">
        <div class="tx-icon">
        ${t.icon || (t.type === 'income' ? '💰' : '💸')}

        </div>
        <div>
          <div class="tx-name">${t.description || t.category}
          </div>

          <div class="tx-date">
          ${formattedDate}
          </div>
        </div>
      </div>
      <div class="tx-amount ${t.type}">
      ${sign}${formatMK(t.amount)}</div>
    </div>
  `;
}

function renderTransactionLists(transactions) {
  const sorted = [...transactions].sort((a, b) => {
    const dateA = new Date(a.date || a.createdAt);
    const dateB = new Date(b.date || b.createdAt);

    return dateB - dateA;
  });
  document.getElementById('recent-tx-list').innerHTML =
   sorted.length > 0
    ? sorted.slice(0, 5).map(txRowHTML).join('')
    : '<p>No transactions yet. </p>';

    document.getElementById('full-tx-list').innerHTML =
    sorted.length > 0
    ? sorted.map(txRowHTML).join('')
    : '<p>No transactions yet. Add your first transaction.</p>';
}

// ---------- Charts ----------
function groupByCategory(transactions) {
  const byCategory = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
  });
  return byCategory;
}

function renderCategoryChart(transactions) {
  const byCategory = groupByCategory(transactions);
  const labels = Object.keys(byCategory);
  const values = Object.values(byCategory);
  const colors = labels.map(l => categoryColors[l] || '#9ca3af');

  if (categoryChartInstance) categoryChartInstance.destroy();
  const ctx = document.getElementById('categoryChart');
  categoryChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0 }] },
    options: {
      cutout: '68%',
      plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 11 } } } }
    }
  });
}

//   fetchTransactions().then(transactions => {
//     const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
//     if (trendChartInstance) trendChartInstance.destroy();
//     trendChartInstance = new Chart(document.getElementById('trendChart'), {
//       type: 'line',
//       data: {
//         labels: sorted.map(t => t.date.slice(5)),
//         datasets: [{
//           label: 'Expense (MK)',
//           data: sorted.filter(t => t.type === 'expense').map(t => t.amount),
//           borderColor: '#16a34a',
//           backgroundColor: 'rgba(22,163,74,0.08)',
//           fill: true,
//           tension: 0.35,
//         }]
//       },
//       options: { plugins: { legend: { display: false } } }
//     });

//     renderCategoryBars(transactions);
//   });
// }

// The labels include every transaction, while the data only includes expense. That can cause mismatched chart values
// improved version

function renderTrendChart() {
  fetchTransactions().then(transactions => {
    const expenses = transactions
      .filter(transaction => transaction.type === 'expense')
      .sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt);
        const dateB = new Date(b.date || b.createdAt);

        return dateA - dateB;
      });

    if (trendChartInstance) {
      trendChartInstance.destroy();
    }

    trendChartInstance = new Chart(
      document.getElementById('trendChart'),
      {
        type: 'line',
        data: {
          labels: expenses.map(transaction => {
            const date = transaction.date || transaction.createdAt;
            return new Date(date).toLocaleDateString();
          }),

          datasets: [
            {
              label: 'Expense (MK)',
              data: expenses.map(transaction =>
                Number(transaction.amount)
              ),
              borderColor: '#16a34a',
              backgroundColor: 'rgba(22,163,74,0.08)',
              fill: true,
              tension: 0.35,
            },
          ],
        },

        options: {
          plugins: {
            legend: {
              display: false,
            },
          },
        },
      }
    );

    renderCategoryBars(transactions);
  });
}
function renderCategoryBars(transactions) {
  const byCategory = groupByCategory(transactions);
  const total = Object.values(byCategory).reduce((a, b) => a + b, 0) || 1;
  const container = document.getElementById('category-bars');
  container.innerHTML = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => {
      const pct = ((amt / total) * 100).toFixed(0);
      const color = categoryColors[cat] || '#9ca3af';
      return `
        <div class="cat-row">
          <div class="cat-row-top">
            <span>${cat}</span>
            <span>${formatMK(amt)} (${pct}%)</span>
          </div>
          <div class="cat-bar-track">
            <div class="cat-bar-fill" style="width:${pct}%; background:${color};"></div>
          </div>
        </div>
      `;
    }).join('');
}

// ---------- AI Advice ----------
async function loadInsights() {
  document.getElementById('health-summary').textContent = 'Analyzing your spending...';
  const insight = await fetchInsights();

  document.getElementById('health-score').textContent = `${insight.score}/100`;
  document.getElementById('health-summary').textContent =
    `${insight.summaryLine} ${insight.explanation}`;

  document.getElementById('ai-tips-list').innerHTML = insight.tips.map(tip => `
    <div class="ai-tip-card">
      <div class="ai-tip-icon">${tip.icon}</div>
      <div>
        <h4>${tip.title}</h4>
        <p>${tip.body}</p>
      </div>
    </div>
  `).join('');
}

// ---------- Add transaction form ----------
document.querySelectorAll('.type-toggle button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.type-toggle button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tx-type').value = btn.dataset.type;
  });
});

document
  .getElementById('transaction-form')
  .addEventListener('submit', async (e) => {
    e.preventDefault();

    const newTx = {
      type: document.getElementById('tx-type').value,
      amount: Number(document.getElementById('amount').value),
      category: document.getElementById('category').value,
      description: document.getElementById('description').value.trim(),
      date: new Date().toISOString(),
    };

    try {
      if (USE_MOCK_DATA) {
        mockTransactions.push({
          id: Date.now(),
          ...newTx,
          icon: newTx.type === 'income' ? '💰' : '💸',
        });
      } else {
        const response = await fetch(`${API_BASE}/transactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
          },
          body: JSON.stringify(newTx),
        });

        const data = await response.json();

        if (response.status === 401) {
          localStorage.removeItem('pw_token');
          localStorage.removeItem('pw_user_name');
          window.location.href = 'login.html';
          return;
        }

        if (!response.ok) {
          throw new Error(data.message || 'Unable to save transaction');
        }
      }

      e.target.reset();

      document
        .querySelectorAll('.type-toggle button')
        .forEach(button => button.classList.remove('active'));

      document
        .querySelector('.type-toggle button[data-type="expense"]')
        .classList.add('active');

      document.getElementById('tx-type').value = 'expense';

      await init();
      switchView('transactions');
    } catch (error) {
      console.error('Add transaction error:', error);
      alert(error.message);
    }
  });


function renderUserName() {
  const name = localStorage.getItem('pw_user_name') || 'User';
  document.getElementById('sidebar-username').textContent = name;
  document.getElementById('topbar-username').textContent = name;
  document.getElementById('avatar-initial').textContent = name.charAt(0).toUpperCase();
}

document.getElementById('logout-link')?.addEventListener('click', () => {
  localStorage.removeItem('pw_user_name');
  localStorage.removeItem('pw_token');
});

// ---------- Init ----------
async function init() {
  // If real auth is on and there's no token, don't even try loading data —
  // send the user back to login first.
  if (!USE_MOCK_DATA && !localStorage.getItem('pw_token')) {
    window.location.href = 'login.html';
    return;
  }

  renderUserName();
  const transactions = await fetchTransactions();
  renderStats(transactions);
  renderTransactionLists(transactions);
  renderCategoryChart(transactions);
}

init();
