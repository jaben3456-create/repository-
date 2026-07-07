let dashboardShowByAccount = false;

function renderDashboard(state) {
  const root = document.getElementById('tab-dashboard');
  root.innerHTML = '';

  const holdings = computeHoldings(state);
  const totals = computeTotals(holdings);
  const daily = computeDailyChange(state);
  const divStats = dividendStats(state);

  root.appendChild(renderSyncCard(state, { compact: true, onDone: () => renderDashboard(state) }));

  const statGrid = el('div', { class: 'stat-grid' });

  statGrid.appendChild(makeStatTile('Total portfolio value', formatCurrency(totals.total), null));

  if (daily) {
    const isGood = daily.dollar >= 0;
    statGrid.appendChild(makeStatTile(
      `Change since ${formatDateShort(daily.prevDate)}`,
      `${daily.dollar >= 0 ? '+' : ''}${formatCurrency(daily.dollar)}`,
      { text: `${isGood ? '▲' : '▼'} ${formatPercent(daily.pct)}`, cls: isGood ? 'good' : 'bad' }
    ));
  } else {
    statGrid.appendChild(makeStatTile('Daily change', '—', { text: 'Update prices on another day to see day-over-day change', cls: 'neutral' }));
  }

  const gainGood = totals.totalGain >= 0;
  statGrid.appendChild(makeStatTile(
    'Total unrealized gain/loss',
    `${totals.totalGain >= 0 ? '+' : ''}${formatCurrency(totals.totalGain)}`,
    { text: `${gainGood ? '▲' : '▼'} ${formatPercent(totals.totalGainPct)} vs cost basis`, cls: gainGood ? 'good' : 'bad' }
  ));

  statGrid.appendChild(makeStatTile('Dividends received (YTD)', formatCurrency(divStats.ytd), { text: `${formatCurrency(divStats.trailing12)} trailing 12mo`, cls: 'neutral' }));

  root.appendChild(statGrid);

  const accountCard = el('div', { class: 'card' });
  accountCard.appendChild(el('h2', { text: 'Account breakdown' }));
  if (!totals.byAccount.length) {
    accountCard.appendChild(el('div', { class: 'empty-state', text: 'No positions yet. Add holdings in the "Holdings & Sync" tab.' }));
  } else {
    const table = el('table');
    table.appendChild(el('thead', {}, el('tr', {}, [
      el('th', { text: 'Account' }), el('th', { text: 'Value' }), el('th', { text: '% of portfolio' }),
    ])));
    const tbody = el('tbody');
    totals.byAccount.forEach((a) => {
      tbody.appendChild(el('tr', {}, [
        el('td', {}, el('span', { class: 'account-tag', text: a.account })),
        el('td', { text: formatCurrency(a.value) }),
        el('td', { text: `${a.pct.toFixed(1)}%` }),
      ]));
    });
    table.appendChild(tbody);
    accountCard.appendChild(el('div', { class: 'table-scroll' }, table));
  }
  root.appendChild(accountCard);

  const trendCard = el('div', { class: 'card' });
  trendCard.appendChild(el('h2', { text: 'Portfolio value trend' }));
  trendCard.appendChild(el('p', { class: 'card-sub', text: 'Built from snapshots recorded whenever you update your prices — update at least once a day to track daily returns.' }));

  if (state.history.length < 2) {
    trendCard.appendChild(el('div', { class: 'empty-state', text: 'Add positions and come back after updating prices on a different day to see a trend line.' }));
  } else {
    const accounts = totals.byAccount.map((a) => a.account);
    if (accounts.length > 1) {
      const toggleRow = el('label', { class: 'toggle-row' });
      const checkbox = el('input', { type: 'checkbox' });
      checkbox.checked = dashboardShowByAccount;
      checkbox.addEventListener('change', () => { dashboardShowByAccount = checkbox.checked; renderDashboard(state); });
      toggleRow.appendChild(checkbox);
      toggleRow.appendChild(document.createTextNode('Show by account'));
      trendCard.appendChild(toggleRow);
    }

    const chartDiv = el('div');
    trendCard.appendChild(chartDiv);
    const xLabels = state.history.map((h) => formatDateShort(h.date));

    if (dashboardShowByAccount && accounts.length > 1) {
      const series = accounts.map((acc) => ({
        name: acc,
        values: state.history.map((h) => h.byAccount[acc] || 0),
      }));
      drawLineChart(chartDiv, { series, xLabels });
    } else {
      drawLineChart(chartDiv, { series: [{ name: 'Total value', values: state.history.map((h) => h.total) }], xLabels });
    }

    const details = el('details', { class: 'table-toggle' });
    details.appendChild(el('summary', { text: 'View as table' }));
    const table = el('table');
    table.appendChild(el('thead', {}, el('tr', {}, [el('th', { text: 'Date' }), el('th', { text: 'Total value' })])));
    const tbody = el('tbody');
    [...state.history].reverse().forEach((h) => {
      tbody.appendChild(el('tr', {}, [el('td', { text: h.date }), el('td', { text: formatCurrency(h.total) })]));
    });
    table.appendChild(tbody);
    details.appendChild(el('div', { class: 'table-scroll' }, table));
    trendCard.appendChild(details);
  }
  root.appendChild(trendCard);

  const holdingsCard = el('div', { class: 'card' });
  holdingsCard.appendChild(el('h2', { text: 'Holdings' }));
  if (!holdings.length) {
    holdingsCard.appendChild(el('div', { class: 'empty-state', text: 'No holdings yet.' }));
  } else {
    const table = el('table');
    table.appendChild(el('thead', {}, el('tr', {}, [
      el('th', { text: 'Account' }), el('th', { text: 'Symbol' }), el('th', { text: 'Shares' }),
      el('th', { text: 'Avg cost' }), el('th', { text: 'Price' }), el('th', { text: 'Market value' }),
      el('th', { text: 'Gain/loss' }),
    ])));
    const tbody = el('tbody');
    holdings.sort((a, b) => b.marketValue - a.marketValue).forEach((h) => {
      tbody.appendChild(el('tr', {}, [
        el('td', {}, el('span', { class: 'account-tag', text: h.account })),
        el('td', { text: h.symbol }),
        el('td', { text: h.shares }),
        el('td', { text: formatCurrency(h.avgCost) }),
        el('td', { text: formatCurrency(h.price) }),
        el('td', { text: formatCurrency(h.marketValue) }),
        el('td', { class: h.gain >= 0 ? 'gain-pos' : 'gain-neg', text: `${h.gain >= 0 ? '+' : ''}${formatCurrency(h.gain)} (${formatPercent(h.gainPct)})` }),
      ]));
    });
    table.appendChild(tbody);
    holdingsCard.appendChild(el('div', { class: 'table-scroll' }, table));
  }
  root.appendChild(holdingsCard);
}

function makeStatTile(label, value, delta) {
  const tile = el('div', { class: 'stat-tile' });
  tile.appendChild(el('div', { class: 'stat-tile__label', text: label }));
  tile.appendChild(el('div', { class: 'stat-tile__value', text: value }));
  if (delta) {
    tile.appendChild(el('div', { class: `stat-tile__delta ${delta.cls}`, text: delta.text }));
  }
  return tile;
}
