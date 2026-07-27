function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stdDev(values) {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function zScore(value, historicalValues) {
  const sd = stdDev(historicalValues);
  if (sd === 0) return 0;
  const m = mean(historicalValues);
  return (value - m) / sd;
}

function percentChange(current, previous) {
  if (previous <= 0) return null;
  return (current - previous) / previous;
}

module.exports = { mean, stdDev, zScore, percentChange };
