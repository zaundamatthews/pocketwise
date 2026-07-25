const rules = require('./rules');

const NO_DATA_RESPONSE = {
  summary: "We've logged your recent transactions.",
  explanation: 'Add a few more transactions to unlock a detailed insight.',
  tips: ['Keep tracking your spending for personalized insights.', 'Check back after a few more transactions.'],
  matchedRules: [],
};

// Absolute last resort — used only if the rule engine itself throws
// unexpectedly. This never depends on any external data, so it can
// never fail.
const EMERGENCY_RESPONSE = {
  summary: 'Your transactions are being tracked.',
  explanation: "We're processing your spending data. Check back shortly for a detailed insight.",
  tips: ['Keep adding transactions for better insights.', 'Refresh in a moment to see your latest summary.'],
  matchedRules: [],
  source: 'emergency-fallback',
};

// Every rule assumes these fields exist with the right type. If a
// malformed summary reaches this engine (a bug upstream, a bad object),
// we bail out to NO_DATA_RESPONSE rather than let individual rules
// silently produce garbage like "NaN% of your income".
function isValidSummary(summary) {
  if (!summary || typeof summary !== 'object') return false;
  if (typeof summary.byCategory !== 'object' || summary.byCategory === null) return false;
  if (typeof summary.byWeek !== 'object' || summary.byWeek === null) return false;
  if (typeof summary.byDayOfWeek !== 'object' || summary.byDayOfWeek === null) return false;
  if (typeof summary.totalSpent !== 'number' || isNaN(summary.totalSpent)) return false;
  return true;
}

function generateRuleBasedInsights(summary) {
  try {
    if (!isValidSummary(summary)) return NO_DATA_RESPONSE;

    const matches = rules
      .map(rule => {
        try {
          return rule(summary);
        } catch (err) {
          console.error(`Rule "${rule.name}" threw an error:`, err.message);
          return null;
        }
      })
      .filter(Boolean);

    if (matches.length === 0) return NO_DATA_RESPONSE;

    matches.sort((a, b) => b.score - a.score);

    const primary = matches[0];
    const supportingTips = matches.slice(1).map(m => m.tip);
    const tips = [primary.tip, ...supportingTips].filter((tip, i, arr) => arr.indexOf(tip) === i).slice(0, 2);

    return {
      summary: primary.summary,
      explanation: primary.explanation,
      tips,
      matchedRules: matches.map(m => ({ id: m.id, score: Math.round(m.score * 10) / 10 })),
    };
  } catch (err) {
    console.error('generateRuleBasedInsights failed unexpectedly, using emergency response:', err.message);
    return EMERGENCY_RESPONSE;
  }
}

module.exports = { generateRuleBasedInsights };
