const { setCors, requireAuth, getClient, unwrap, errorMessage } = require('./_lib');

// SnapTrade's Account.name is "a display name for the account, either
// assigned by the user or the brokerage itself" - for a multi-account
// brokerage like Robinhood this is normally something like "Individual" or
// "Roth IRA". Fall back to raw_type (brokerage's own account type string)
// or the account number if a name isn't available, so every SnapTrade
// account maps to its own distinct, human-readable label instead of every
// sub-account collapsing into one flat "Robinhood" bucket.
function accountLabel(account) {
  const raw = account.name || account.raw_type || account.number || account.id;
  const cleaned = String(raw).replace(/_/g, ' ').trim();
  return /robinhood/i.test(cleaned) ? cleaned : `Robinhood ${cleaned}`;
}

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
      const label = accountLabel(account);
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
          account: label,
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
            account: label,
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
