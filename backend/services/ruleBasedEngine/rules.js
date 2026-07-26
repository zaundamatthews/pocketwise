const { zScore, percentChange } = require('./statistics');
const config = require('./config');
const { formatMWK } = require('../../utils/formatCurrency');

function getSortedWeekKeys(byWeek) {
  return Object.keys(byWeek).sort();
}

function categoryWeeklySeries(byWeek, weekKeys, category) {
  return weekKeys.map(w => byWeek[w].byCategory[category] || 0);
}

// --- Rule 1: spending consuming most of income ---
function highSpendingRatio(summary) {
  if (summary.spendingRatio === null || summary.spendingRatio <= config.HIGH_SPENDING_RATIO_THRESHOLD) return null;
  const score = Math.min(100, 50 + (summary.spendingRatio - config.HIGH_SPENDING_RATIO_THRESHOLD) * 100);
  return {
    id: 'highSpendingRatio',
    score,
    summary: `You're spending ${Math.round(summary.spendingRatio * 100)}% of your income.`,
    explanation: `Your expenses are consuming most of your income this period, led by ${summary.topCategory}.`,
    tip: 'Review non-essential spending, starting with your top category.',
  };
}

// --- Rule 2: healthy savings rate (positive insight) ---
function healthySavings(summary) {
  if (summary.savingsRate === null || summary.savingsRate <= config.HEALTHY_SAVINGS_THRESHOLD) return null;
  const score = Math.min(90, 35 + summary.savingsRate * 100);
  return {
    id: 'healthySavings',
    score,
    summary: `You saved ${Math.round(summary.savingsRate * 100)}% of your income this period.`,
    explanation: `That's a healthy savings rate. Your biggest expense category was ${summary.topCategory}.`,
    tip: 'Automate a transfer to savings each payday to keep this pace.',
  };
}

// --- Rule 3: statistical anomaly — a category spiked vs its own history ---
function categoryAnomalySpike(summary) {
  const weekKeys = getSortedWeekKeys(summary.byWeek);
  if (weekKeys.length < config.MIN_WEEKS_FOR_ANOMALY_DETECTION) return null;

  let best = null;
  Object.keys(summary.byCategory).forEach(category => {
    const series = categoryWeeklySeries(summary.byWeek, weekKeys, category);
    const current = series[series.length - 1];
    const history = series.slice(0, -1);
    if (history.length < 2) return;

    const z = zScore(current, history);
    if (z > config.CATEGORY_ANOMALY_ZSCORE_THRESHOLD) {
      const score = Math.min(100, 50 + z * 10);
      if (!best || score > best.score) {
        best = {
          id: 'categoryAnomalySpike',
          score,
          summary: `Your ${category} spending spiked this week.`,
          explanation: `This week's ${category} spending is unusually high compared to your recent weekly average (z-score ${z.toFixed(2)}).`,
          tip: `Review recent ${category} purchases to see what drove the spike.`,
        };
      }
    }
  });
  return best;
}

// --- Rule 4: overall spending surged week over week ---
function weekOverWeekSurge(summary) {
  const weekKeys = getSortedWeekKeys(summary.byWeek);
  if (weekKeys.length < 2) return null;

  const prevWeek = summary.byWeek[weekKeys[weekKeys.length - 2]].total;
  const currWeek = summary.byWeek[weekKeys[weekKeys.length - 1]].total;
  const change = percentChange(currWeek, prevWeek);
  if (change === null || change <= config.WEEK_OVER_WEEK_SURGE_PCT_THRESHOLD) return null;

  const score = Math.min(100, 40 + change * 100);
  return {
    id: 'weekOverWeekSurge',
    score,
    summary: `Your spending jumped ${Math.round(change * 100)}% from last week.`,
    explanation: `Total spending rose from ${formatMWK(prevWeek)} to ${formatMWK(currWeek)} week over week.`,
    tip: 'Check what changed this week versus last to spot one-off vs recurring costs.',
  };
}

// --- Rule 5: multiple same-category purchases in a single day ---
function sameDayRepeatPurchases(summary) {
  if (summary.maxSameCategoryInOneDay < config.SAME_DAY_REPEAT_COUNT_THRESHOLD) return null;
  const category = summary.maxSameCategoryInOneDayCategory;
  const score = Math.min(100, 30 + summary.maxSameCategoryInOneDay * 10);
  return {
    id: 'sameDayRepeatPurchases',
    score,
    summary: `Multiple ${category} purchases happened on the same day.`,
    explanation: `You made ${summary.maxSameCategoryInOneDay} separate ${category} purchases in a single day.`,
    tip: `Consider consolidating ${category} purchases to cut down on impulse spend.`,
  };
}

// --- Rule 6: spending skewed toward the weekend ---
function weekendSkew(summary) {
  if (summary.totalSpent <= 0) return null;
  const weekend = (summary.byDayOfWeek.Fri || 0) + (summary.byDayOfWeek.Sat || 0) + (summary.byDayOfWeek.Sun || 0);
  const ratio = weekend / summary.totalSpent;
  if (ratio <= config.WEEKEND_SPENDING_RATIO_THRESHOLD) return null;

  const score = Math.min(100, 30 + ratio * 70);
  return {
    id: 'weekendSkew',
    score,
    summary: 'Most of your spending happens Friday through Sunday.',
    explanation: `${Math.round(ratio * 100)}% of your total spending falls on Friday, Saturday, or Sunday.`,
    tip: 'Set a weekend spending cap to spread costs more evenly across the week.',
  };
}

// --- Rule 7: one category dominates total spend ---
function singleCategoryDominance(summary) {
  if (summary.totalSpent <= 0 || !summary.topCategory) return null;
  const topAmount = summary.byCategory[summary.topCategory] || 0;
  const ratio = topAmount / summary.totalSpent;
  if (ratio <= config.SINGLE_CATEGORY_DOMINANCE_RATIO_THRESHOLD) return null;

  const score = Math.min(100, 35 + ratio * 65);
  return {
    id: 'singleCategoryDominance',
    score,
    summary: `${summary.topCategory} dominates your spending.`,
    explanation: `${summary.topCategory} makes up ${Math.round(ratio * 100)}% of your total spend (${formatMWK(topAmount)} of ${formatMWK(summary.totalSpent)}).`,
    tip: `Look for ways to diversify or trim spending in ${summary.topCategory}.`,
  };
}

// --- Rule 8: baseline fallback — always applies if there's a top category, lowest priority ---
function topCategoryBaseline(summary) {
  if (!summary.topCategory) return null;
  return {
    id: 'topCategoryBaseline',
    score: 10,
    summary: `Your biggest spending category was ${summary.topCategory}.`,
    explanation: `You spent ${formatMWK(summary.byCategory[summary.topCategory])} on ${summary.topCategory}, more than any other category.`,
    tip: 'Check your top spending category and see if it matches your priorities.',
  };
}

module.exports = [
  highSpendingRatio,
  healthySavings,
  categoryAnomalySpike,
  weekOverWeekSurge,
  sameDayRepeatPurchases,
  weekendSkew,
  singleCategoryDominance,
  topCategoryBaseline,
];
