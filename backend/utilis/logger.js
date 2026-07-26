function baseLog(level, event, fields = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...fields,
  };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else console.log(line);
  return entry;
}

function info(event, fields) {
  return baseLog('info', event, fields);
}

function error(event, fields) {
  return baseLog('error', event, fields);
}

// Convenience helper specifically for insight-generation requests,
// since that's the metric worth tracking in a demo: which source
// answered the request, how long it took, and what fired.
function logInsightRequest({ source, latencyMs, matchedRules, error: errMsg }) {
  return baseLog(errMsg ? 'error' : 'info', 'insight_request', {
    source,
    latencyMs,
    matchedRuleCount: Array.isArray(matchedRules) ? matchedRules.length : undefined,
    topRule: Array.isArray(matchedRules) && matchedRules.length ? matchedRules[0].id : undefined,
    error: errMsg,
  });
}

module.exports = { info, error, logInsightRequest };
