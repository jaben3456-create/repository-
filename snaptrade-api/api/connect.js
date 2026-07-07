const { setCors, requireAuth, getClient, getUserCreds } = require('./_lib');

// Returns a one-time SnapTrade Connection Portal URL (expires in 5 minutes)
// that sends the user to Robinhood's own login/2FA, then back to SnapTrade
// to confirm read-only data sharing. The frontend navigates the browser to
// this URL - we never see the Robinhood password ourselves.
module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res)) return;

  const { userId, userSecret } = getUserCreds();
  if (!userId || !userSecret) {
    return res.status(400).json({ error: 'SNAPTRADE_USER_SECRET is not set yet. Call /api/register once first and save the returned userSecret.' });
  }

  try {
    const snaptrade = getClient();
    const result = await snaptrade.authentication.loginSnapTradeUser({
      userId,
      userSecret,
      broker: 'ROBINHOOD',
      connectionType: 'read',
      customRedirect: process.env.CONNECT_REDIRECT_URL || undefined,
    });
    const data = result && result.data ? result.data : result;
    return res.status(200).json({ redirectURI: data.redirectURI });
  } catch (err) {
    return res.status(500).json({ error: err.responseBody || err.message || String(err) });
  }
};
