function defaultState() {
  return {
    positions: [],
    history: [],
    dividends: [],
    projection: { rate: 8, years: 20, contribution: 0, startOverride: null },
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed };
  } catch (e) {
    console.error('Failed to load state, starting fresh', e);
    return defaultState();
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function computeHoldings(state) {
  return state.positions.map((p) => {
    const marketValue = p.shares * p.price;
    const costBasisTotal = p.shares * p.avgCost;
    const gain = marketValue - costBasisTotal;
    const gainPct = costBasisTotal > 0 ? (gain / costBasisTotal) * 100 : 0;
    return { ...p, marketValue, costBasisTotal, gain, gainPct };
  });
}

function computeTotals(holdings) {
  const total = holdings.reduce((s, h) => s + h.marketValue, 0);
  const totalCost = holdings.reduce((s, h) => s + h.costBasisTotal, 0);
  const byAccountMap = {};
  for (const h of holdings) {
    byAccountMap[h.account] = (byAccountMap[h.account] || 0) + h.marketValue;
  }
  const byAccount = Object.entries(byAccountMap)
    .map(([account, value]) => ({ account, value, pct: total > 0 ? (value / total) * 100 : 0 }))
    .sort((a, b) => b.value - a.value);
  return {
    total,
    totalCost,
    totalGain: total - totalCost,
    totalGainPct: totalCost > 0 ? ((total - totalCost) / totalCost) * 100 : 0,
    byAccount,
  };
}

function recordSnapshot(state) {
  const holdings = computeHoldings(state);
  const totals = computeTotals(holdings);
  const today = todayStr();
  const byAccountObj = {};
  totals.byAccount.forEach((a) => { byAccountObj[a.account] = a.value; });
  const entry = { date: today, total: totals.total, byAccount: byAccountObj };
  const idx = state.history.findIndex((h) => h.date === today);
  if (idx >= 0) state.history[idx] = entry;
  else state.history.push(entry);
  state.history.sort((a, b) => a.date.localeCompare(b.date));
}

function computeDailyChange(state) {
  if (state.history.length < 2) return null;
  const last = state.history[state.history.length - 1];
  const prev = state.history[state.history.length - 2];
  const dollar = last.total - prev.total;
  const pct = prev.total > 0 ? (dollar / prev.total) * 100 : 0;
  return { dollar, pct, prevDate: prev.date, lastDate: last.date };
}

function dividendStats(state) {
  const divs = state.dividends;
  const today = new Date();
  const ytdYear = String(today.getFullYear());
  const totalAllTime = divs.reduce((s, d) => s + d.amount, 0);
  const ytd = divs.filter((d) => d.date.startsWith(ytdYear)).reduce((s, d) => s + d.amount, 0);
  const cutoff = new Date(today);
  cutoff.setMonth(cutoff.getMonth() - 12);
  const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;
  const trailing12 = divs.filter((d) => d.date >= cutoffStr).reduce((s, d) => s + d.amount, 0);

  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const byMonthMap = {};
  for (const d of divs) {
    const mk = monthKey(d.date);
    byMonthMap[mk] = (byMonthMap[mk] || 0) + d.amount;
  }
  const byMonth = months.map((mk) => ({ month: mk, amount: byMonthMap[mk] || 0 }));

  return {
    totalAllTime,
    ytd,
    trailing12,
    avgMonthly: trailing12 / 12,
    byMonth,
  };
}

function buildProjection({ start, rate, years, contribution }) {
  const r = rate / 100;
  const rows = [{ year: 0, balance: start, contributed: 0 }];
  let balance = start;
  let contributed = 0;
  for (let y = 1; y <= years; y++) {
    balance = balance * (1 + r) + contribution;
    contributed += contribution;
    rows.push({ year: y, balance, contributed });
  }
  return rows;
}
