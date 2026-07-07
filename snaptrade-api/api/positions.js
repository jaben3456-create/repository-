const { setCors, requireAuth, getClient, getUserCreds, unwrap, errorMessage } = require('./_lib');

// Fetches every connected Robinhood account's current positions and shapes
// them to match the portfolio tracker's own position schema:
// { account, symbol, shares, avgCost, price }.
module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res)) return;

  const { userId, userSecret } = getUserCreds();
  if (!userId || !userSecret) {
    return res.status(400).json({ error: 'Not connected yet. Use "Connect Robinhood" first.' });
  }

  try {
    const snaptrade = getClient();
    const accountsResult = await snaptrade.accountInformation.listUserAccounts({ userId, userSecret });
    const accounts = unwrap(accountsResult);

    const positions = [];
    for (const account of accounts) {
      const posResult = await snaptrade.accountInformation.getUserAccountPositions({
        userId,
        userSecret,
        accountId: account.id,
      });
      const accountPositions = unwrap(posResult);

      for (const p of accountPositions) {
        const universalSymbol = p.symbol && p.symbol.symbol;
        const ticker = universalSymbol && (universalSymbol.raw_symbol || universalSymbol.symbol);
        if (!ticker || !p.units) continue;
        positions.push({
          account: 'Robinhood',
          symbol: ticker,
          shares: p.units,
          avgCost: p.average_purchase_price != null ? p.average_purchase_price : (p.price || 0),
          price: p.price != null ? p.price : (p.average_purchase_price || 0),
        });
      }
    }

    return res.status(200).json({ positions });
  } catch (err) {
    return res.status(500).json({ error: errorMessage(err) });
  }
};
