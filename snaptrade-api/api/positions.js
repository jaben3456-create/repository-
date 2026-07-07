const { setCors, requireAuth, getClient, unwrap, errorMessage } = require('./_lib');

// Fetches every connected Robinhood account's current positions and shapes
// them to match the portfolio tracker's own position schema:
// { account, symbol, shares, avgCost, price }.
//
// Personal SnapTrade API keys have one implicit user - do not pass
// userId/userSecret (see connect.js for why).
module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res)) return;

  try {
    const snaptrade = getClient();
    const accountsResult = await snaptrade.accountInformation.listUserAccounts({});
    const accounts = unwrap(accountsResult);

    const positions = [];
    for (const account of accounts) {
      const posResult = await snaptrade.accountInformation.getUserAccountPositions({
        accountId: account.id,
      });
      const accountPositions = unwrap(posResult);

      let positionsSum = 0;
      for (const p of accountPositions) {
        const universalSymbol = p.symbol && p.symbol.symbol;
        const ticker = universalSymbol && (universalSymbol.raw_symbol || universalSymbol.symbol);
        if (!ticker || !p.units) continue;
        const price = p.price != null ? p.price : (p.average_purchase_price || 0);
        positionsSum += p.units * price;
        positions.push({
          account: 'Robinhood',
          symbol: ticker,
          shares: p.units,
          avgCost: p.average_purchase_price != null ? p.average_purchase_price : price,
          price,
        });
      }

      // Reconcile against the brokerage's own authoritative account total
      // (which includes cash, and anything else - e.g. options - that this
      // endpoint doesn't return) so cash on the sidelines isn't silently
      // dropped from the portfolio total.
      const totalAmount = account.balance && account.balance.total && typeof account.balance.total.amount === 'number'
        ? account.balance.total.amount
        : null;
      if (totalAmount != null) {
        const remainder = totalAmount - positionsSum;
        if (Math.abs(remainder) > 0.01) {
          positions.push({
            account: 'Robinhood',
            symbol: 'CASH',
            shares: remainder,
            avgCost: 1,
            price: 1,
          });
        }
      }
    }

    return res.status(200).json({ positions });
  } catch (err) {
    return res.status(500).json({ error: errorMessage(err) });
  }
};
