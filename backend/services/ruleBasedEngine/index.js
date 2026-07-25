const rules = require('./rules');

const NO_DATA_RESPONSE = {
  summary: "We've logged your recent transactions.",
  explanation: 'Add a few more transactions to unlock a detailed insight.',
  tips: ['Keep tracking your spending for personalized insights.', 'Check back after a few more transactions.'],
  matchedRules: [],
};

function generateRuleBasedInsights(summary) {
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
}

module.exports = { generateRuleBasedInsights };
