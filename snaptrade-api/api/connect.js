const { setCors, requireAuth, getClient, errorMessage } = require('./_lib');

// Returns a one-time SnapTrade Connection Portal URL (expires in 5 minutes)
// that sends the user to Robinhood's own login/2FA, then back to SnapTrade
// to confirm read-only data sharing. The frontend navigates the browser to
// this URL - we never see the Robinhood password ourselves.
//
// Personal SnapTrade API keys auto-provision a single implicit user - do
// NOT call registerSnapTradeUser or pass userId/userSecret here (that's
// the Commercial-key flow and personal keys reject it). This matches the
// official SnapTrade CLI's own connect command.
module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res)) return;

  try {
    const snaptrade = getClient();
    const result = await snaptrade.authentication.loginSnapTradeUser({
      broker: 'ROBINHOOD',
      connectionType: 'read',
      customRedirect: process.env.CONNECT_REDIRECT_URL || undefined,
    });
    const data = result && result.data ? result.data : result;
    return res.status(200).json({ redirectURI: data.redirectURI });
  } catch (err) {
    return res.status(500).json({ error: errorMessage(err) });
  }
};
