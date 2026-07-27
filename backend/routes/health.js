const express = require('express');
const router = express.Router();
const { withRetry } = require('../utils/withRetry');
const cache = require('../utils/cache');

router.get('/', async (req, res) => {
  const hasApiKey = Boolean(process.env.OPENAI_API_KEY);
  const hasMongoUri = Boolean(process.env.MONGO_URI);

  let openaiReachable = null;
  if (hasApiKey) {
    try {
      // A models.list() call is cheap/free and confirms the key + network
      // path work, without spending tokens on a real completion.
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      await withRetry(() => openai.models.list(), { retries: 0, timeoutMs: 4000, label: 'health-check' });
      openaiReachable = true;
    } catch (err) {
      openaiReachable = false;
    }
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {
      openaiKeyConfigured: hasApiKey,
      openaiReachable,
      mongoUriConfigured: hasMongoUri,
    },
    cache: {
      entries: cache.size(),
    },
  });
});

module.exports = router;
