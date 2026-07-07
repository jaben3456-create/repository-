const { Snaptrade } = require('snaptrade-typescript-sdk');

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

function getClient() {
  return new Snaptrade({
    consumerKey: process.env.SNAPTRADE_CONSUMER_KEY,
    clientId: process.env.SNAPTRADE_CLIENT_ID,
  });
}

function getUserCreds() {
  return {
    userId: process.env.SNAPTRADE_USER_ID,
    userSecret: process.env.SNAPTRADE_USER_SECRET,
  };
}

// The generated SDK sometimes returns the raw payload and sometimes an
// axios-style { data } wrapper depending on version - handle both.
function unwrap(result) {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.data)) return result.data;
  return result || [];
}

module.exports = { setCors, requireAuth, getClient, getUserCreds, unwrap };
