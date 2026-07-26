const MAX_CATEGORY_LENGTH = 40;

// Phrases that suggest someone is trying to override the system prompt
// via a category name rather than just naming a spending category.
const INJECTION_PATTERNS = [
  /ignore (all )?(previous|prior|above) instructions/i,
  /disregard (all )?(previous|prior|above)/i,
  /you are now/i,
  /system prompt/i,
  /new instructions?:/i,
  /act as/i,
  /forget (everything|all)/i,
];

function sanitizeCategoryName(rawName) {
  if (typeof rawName !== 'string' || !rawName.trim()) return 'Uncategorized';

  let name = rawName.trim().slice(0, MAX_CATEGORY_LENGTH);

  // Strip characters with no place in a category name — keep letters,
  // numbers, spaces, and basic punctuation only.
  name = name.replace(/[^\w\s&\-'.]/g, '');

  const looksLikeInjection = INJECTION_PATTERNS.some(pattern => pattern.test(name));
  if (looksLikeInjection) return 'Uncategorized';

  return name || 'Uncategorized';
}

function sanitizeTransactions(transactions) {
  if (!Array.isArray(transactions)) return [];
  return transactions.map(t => ({
    ...t,
    category: sanitizeCategoryName(t.category),
  }));
}

module.exports = { sanitizeCategoryName, sanitizeTransactions };
