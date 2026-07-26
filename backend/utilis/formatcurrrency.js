function formatMWK(amount) {
  const num = Number(amount) || 0;
  return `MWK ${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

module.exports = { formatMWK };
