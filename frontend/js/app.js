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
  if (USE_MOCK_DATA) return mockTransactions;
  const res = await fetch(`${API_BASE}/transactions`, {
    headers: { ...authHeaders() },
  });
  if (res.status === 401) {
    // Token missing/expired — send back to login instead of crashing.
    window.location.href = 'login.html';
    return [];
  }
  return res.json();
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

// ---------- Stat cards ----------
function computeStats(transactions) {
  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - expenses;
  const savingsRate = income > 0 ? ((balance / income) * 100).toFixed(1) : 0;
  return { income, expenses, balance, savingsRate };
}

function formatMK(n) {
  return 'MK' + n.toLocaleString();
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
  return `
    <div class="tx-row">
      <div class="tx-left">
        <div class="tx-icon">${t.icon || (t.type === 'income' ? '💰' : '💸')}</div>
        <div>
          <div class="tx-name">${t.description || t.category}</div>
          <div class="tx-date">${t.date}</div>
        </div>
      </div>
      <div class="tx-amount ${t.type}">${sign}${formatMK(t.amount)}</div>
    </div>
  `;
}

function renderTransactionLists(transactions) {
  const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  document.getElementById('recent-tx-list').innerHTML = sorted.slice(0, 5).map(txRowHTML).join('');
  document.getElementById('full-tx-list').innerHTML = sorted.map(txRowHTML).join('');
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

function renderTrendChart() {
  fetchTransactions().then(transactions => {
    const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    if (trendChartInstance) trendChartInstance.destroy();
    trendChartInstance = new Chart(document.getElementById('trendChart'), {
      type: 'line',
      data: {
        labels: sorted.map(t => t.date.slice(5)),
        datasets: [{
          label: 'Expense (MK)',
          data: sorted.filter(t => t.type === 'expense').map(t => t.amount),
          borderColor: '#16a34a',
          backgroundColor: 'rgba(22,163,74,0.08)',
          fill: true,
          tension: 0.35,
        }]
      },
      options: { plugins: { legend: { display: false } } }
    });

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

document.getElementById('transaction-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const newTx = {
    id: Date.now(),
    type: document.getElementById('tx-type').value,
    amount: Number(document.getElementById('amount').value),
    category: document.getElementById('category').value,
    description: document.getElementById('description').value,
    date: new Date().toISOString().slice(0, 10),
    icon: document.getElementById('tx-type').value === 'income' ? '💰' : '💸',
  };

  if (USE_MOCK_DATA) {
    mockTransactions.push(newTx);
  } else {
    await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(newTx),
    });
  }

  e.target.reset();
  document.querySelectorAll('.type-toggle button').forEach(b => b.classList.remove('active'));
  document.querySelector('.type-toggle button[data-type="expense"]').classList.add('active');
  document.getElementById('tx-type').value = 'expense';

  init();
  switchView('transactions');
});

// ---------- Display logged-in user's name ----------
// Demo-only: name comes from what was typed at login/signup (see login.html /
// signup.html). Once real auth is wired in, replace this with the
// name returned from the backend after a real login call.
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
