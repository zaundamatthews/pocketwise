const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const OpenAI = require('openai');
const { generateRuleBasedInsights } = require('../services/ruleBasedEngine');
const { withRetry } = require('../utils/withRetry');
const { sanitizeTransactions } = require('../utils/sanitize');
const cache = require('../utils/cache');
const logger = require('../utils/logger');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are a friendly, practical financial coach for someone in Malawi.
You will receive a JSON summary of a user's spending, grouped by category
and by week.

Respond with exactly this JSON shape and nothing else:
{
  "summary": "<one sentence naming the biggest spending pattern>",
  "explanation": "<2-3 sentences explaining WHY this is likely happening,
    referencing specific categories, amounts, or days from
    the data>",
  "tips": ["<specific actionable tip 1>", "<specific actionable tip 2>"]
}

Rules:
- Be concrete. Reference actual numbers or categories from the data.
- Do NOT give generic advice like "spend less" or "save more".
- Keep the whole response under 80 words.
- Tone: encouraging, not judgmental.`;

router.post('/generate', async (req, res) => {
  const startedAt = Date.now();
  try {
    const rawTransactions = await Transaction.find();

    if (!rawTransactions || rawTransactions.length === 0) {
      const response = {
        summary: "No spending data yet.",
        explanation: "We don't have enough transactions to spot a pattern yet.",
        tips: ["Add a few transactions to get your first insight.", "Check back after your next few purchases."],
        source: 'no-data',
      };
      logger.logInsightRequest({ source: response.source, latencyMs: Date.now() - startedAt });
      return res.status(200).json(response);
    }

    // Sanitize category names before anything touches the AI prompt —
    // closes off prompt-injection via user-controlled category strings.
    const transactions = sanitizeTransactions(rawTransactions);
    const summary = summarizeTransactions(transactions);

    const cached = cache.get(summary);
    if (cached) {
      logger.logInsightRequest({ source: cached.source, latencyMs: Date.now() - startedAt, matchedRules: cached.matchedRules });
      return res.json({ ...cached, cached: true });
    }

    try {
      const completion = await withRetry(
        () => openai.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.4,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: JSON.stringify(summary) },
          ],
        }),
        { retries: 2, baseDelayMs: 300, timeoutMs: 8000, label: 'OpenAI insights call' }
      );

      const aiText = completion.choices[0].message.content;
      const parsed = parseAiResponse(aiText);
      const response = { ...parsed, source: 'ai' };
      cache.set(summary, response);
      logger.logInsightRequest({ source: 'ai', latencyMs: Date.now() - startedAt });
      return res.json(response);
    } catch (aiErr) {
      logger.error('openai_call_failed', { message: aiErr.message, latencyMs: Date.now() - startedAt });
      const fallbackInsights = generateRuleBasedInsights(summary);
      const response = { ...fallbackInsights, source: fallbackInsights.source || 'rule-based' };
      cache.set(summary, response, 60 * 1000); // shorter TTL for fallback results
      logger.logInsightRequest({ source: response.source, latencyMs: Date.now() - startedAt, matchedRules: fallbackInsights.matchedRules });
      return res.json(response);
    }
  } catch (err) {
    // Absolute last resort: even Transaction.find(), summarizeTransactions,
    // or the fallback engine itself failed. Never let the endpoint 500 —
    // always return something the frontend can render.
    logger.error('insights_generate_unrecoverable', { message: err.message, latencyMs: Date.now() - startedAt });
    res.status(200).json({
      summary: "We're having trouble generating insights right now.",
      explanation: "This won't affect your saved transactions — please try again shortly.",
      tips: ["Try refreshing in a moment.", "Your transaction history is safe and unaffected."],
      source: 'static-safe-response',
    });
  }
});

function summarizeTransactions(transactions) {
  const byCategory = {};
  const byWeek = {};
  const byDayOfWeek = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
  const categoryCountByDate = {};
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  let totalSpent = 0;
  let totalIncome = 0;
  let expenseCount = 0;

  transactions.forEach(t => {
    const amount = Number(t.amount) || 0;

    if (t.type === 'income') {
      totalIncome += amount;
      return;
    }
    if (t.type !== 'expense') return;

    const category = t.category || 'Uncategorized';
    const date = new Date(t.date);

    byCategory[category] = (byCategory[category] || 0) + amount;

    const weekKey = getWeekKey(date);
    if (!byWeek[weekKey]) byWeek[weekKey] = { total: 0, byCategory: {} };
    byWeek[weekKey].total += amount;
    byWeek[weekKey].byCategory[category] = (byWeek[weekKey].byCategory[category] || 0) + amount;

    const dayName = DAY_NAMES[date.getDay()];
    byDayOfWeek[dayName] += amount;

    const dateKey = isNaN(date.getTime()) ? 'unknown-date' : date.toISOString().slice(0, 10);
    if (!categoryCountByDate[dateKey]) categoryCountByDate[dateKey] = {};
    categoryCountByDate[dateKey][category] = (categoryCountByDate[dateKey][category] || 0) + 1;

    totalSpent += amount;
    expenseCount += 1;
  });

  round(byCategory);
  round(byDayOfWeek);
  Object.values(byWeek).forEach(w => {
    w.total = round1(w.total);
    round(w.byCategory);
  });

  const topCategory = topKey(byCategory);
  const topDay = topKey(byDayOfWeek);

  const spendingRatio = totalIncome > 0 ? round1(totalSpent / totalIncome) : null;
  const savingsRate = totalIncome > 0 ? round1((totalIncome - totalSpent) / totalIncome) : null;

  let maxSameCategoryInOneDay = 0;
  let maxSameCategoryInOneDayCategory = null;
  Object.values(categoryCountByDate).forEach(counts => {
    Object.entries(counts).forEach(([cat, count]) => {
      if (count > maxSameCategoryInOneDay) {
        maxSameCategoryInOneDay = count;
        maxSameCategoryInOneDayCategory = cat;
      }
    });
  });

  return {
    totalTransactions: transactions.length,
    expenseTransactionCount: expenseCount,
    totalSpent: round1(totalSpent),
    totalIncome: round1(totalIncome),
    spendingRatio,
    savingsRate,
    byCategory,
    byWeek,
    byDayOfWeek,
    topCategory,
    topSpendingDay: topDay,
    maxSameCategoryInOneDay,
    maxSameCategoryInOneDayCategory,
  };
}

function getWeekKey(date) {
  if (isNaN(date.getTime())) return "unknown-week";
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function topKey(obj) {
  const entries = Object.entries(obj);
  if (entries.length === 0) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

function round(obj) {
  Object.keys(obj).forEach(k => { obj[k] = round1(obj[k]); });
}
function round1(n) {
  return Math.round(n * 100) / 100;
}

function parseAiResponse(aiText) {
  const fallback = {
    summary: "We spotted some spending activity this period.",
    explanation: "We couldn't generate a detailed breakdown right now, but your transactions are being tracked.",
    tips: ["Check back shortly for a refreshed insight.", "Review your top category in the meantime."],
  };

  if (!aiText || typeof aiText !== 'string') return fallback;

  let cleaned = aiText.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    const summary = typeof parsed.summary === 'string' ? parsed.summary : fallback.summary;
    const explanation = typeof parsed.explanation === 'string' ? parsed.explanation : fallback.explanation;
    let tips = Array.isArray(parsed.tips) ? parsed.tips.filter(t => typeof t === 'string') : [];
    if (tips.length === 0) tips = fallback.tips;

    return { summary, explanation, tips: tips.slice(0, 2) };
  } catch (err) {
    console.error("parseAiResponse: failed to parse AI JSON:", err.message, "\nRaw text:", aiText);
    return fallback;
  }
}

module.exports = router;
module.exports.summarizeTransactions = summarizeTransactions;
module.exports.parseAiResponse = parseAiResponse;
module.exports.SYSTEM_PROMPT = SYSTEM_PROMPT;
