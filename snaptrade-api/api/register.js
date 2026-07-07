const { setCors, requireAuth, getClient, errorMessage } = require('./_lib');

// One-time setup call: creates the single SnapTrade user this personal app
// uses, and returns the userSecret you then paste into the
// SNAPTRADE_USER_SECRET environment variable. Safe to call again later
// (e.g. after resetUserSecret) - registering an existing userId is a no-op
// error from SnapTrade's side, not a data-loss risk.
module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res)) return;

  const userId = process.env.SNAPTRADE_USER_ID;
  if (!userId) {
    return res.status(500).json({ error: 'SNAPTRADE_USER_ID is not set in this deployment\'s environment variables.' });
  }

  try {
    const snaptrade = getClient();
    const result = await snaptrade.authentication.registerSnapTradeUser({ userId });
    const data = result && result.data ? result.data : result;
    return res.status(200).json({
      userId: data.userId,
      userSecret: data.userSecret,
      next: 'Copy userSecret into the SNAPTRADE_USER_SECRET environment variable in your Vercel project, then redeploy. You only need to do this once.',
    });
  } catch (err) {
    return res.status(500).json({ error: errorMessage(err) });
  }
};
