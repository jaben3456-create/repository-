const { Snaptrade, SnaptradeAuth } = require('snaptrade-typescript-sdk');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
}

function requireAuth(req, res) {
  const expected = process.env.API_ACCESS_TOKEN;
  const header = req.headers['authorization'] || '';
  const provided = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!expected || provided !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

// This app uses a Personal SnapTrade API key, which auto-provisions a
// single implicit user (no registerSnapTradeUser / userId / userSecret -
// that's the Commercial-key model). SnaptradeAuth.personalApiKey() is what
// signals that mode to the SDK.
function getClient() {
  return new Snaptrade({
    auth: SnaptradeAuth.personalApiKey({
      consumerKey: process.env.SNAPTRADE_CONSUMER_KEY,
      clientId: process.env.SNAPTRADE_CLIENT_ID,
    }),
  });
}

// The generated SDK sometimes returns the raw payload and sometimes an
// axios-style { data } wrapper depending on version - handle both.
function unwrap(result) {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.data)) return result.data;
  return result || [];
}

// SnapTrade SDK errors carry the real detail in err.responseBody, which is
// often a parsed object (not a string) - stringify it so callers see the
// actual reason instead of "[object Object]".
function errorMessage(err) {
  const body = err && err.responseBody;
  if (body) {
    if (typeof body === 'string') return body;
    try {
      return JSON.stringify(body);
    } catch (e) {
      // fall through
    }
  }
  return (err && err.message) || String(err);
}

module.exports = { setCors, requireAuth, getClient, unwrap, errorMessage };
