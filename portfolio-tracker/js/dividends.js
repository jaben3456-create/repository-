function renderDividends(state) {
  const root = document.getElementById('tab-dividends');
  root.innerHTML = '';

  const stats = dividendStats(state);
  const statGrid = el('div', { class: 'stat-grid' });
  statGrid.appendChild(makeStatTile('Total received (all-time)', formatCurrency(stats.totalAllTime), null));
  statGrid.appendChild(makeStatTile('Received YTD', formatCurrency(stats.ytd), null));
  statGrid.appendChild(makeStatTile('Trailing 12 months', formatCurrency(stats.trailing12), null));
  statGrid.appendChild(makeStatTile('Average per month', formatCurrency(stats.avgMonthly), null));
  root.appendChild(statGrid);

  const projected = computeProjectedDividends(state);
  const projectedCard = el('div', { class: 'card' });
  projectedCard.appendChild(el('h2', { text: 'Projected income from current holdings' }));
  projectedCard.appendChild(el('p', { class: 'card-sub', text: 'Based on the "Annual dividend / share" you set on each position in Holdings & Sync — updates automatically as your shares change. This is a forward-looking estimate, not a record of what was actually paid.' }));
  if (!projected.rows.length) {
    projectedCard.appendChild(el('div', { class: 'empty-state', text: 'No positions have an annual dividend rate set yet. Add one via Holdings & Sync → Add / edit a position.' }));
  } else {
    const projGrid = el('div', { class: 'stat-grid' });
    projGrid.appendChild(makeStatTile('Projected annual income', formatCurrency(projected.totalAnnual), null));
    projGrid.appendChild(makeStatTile('Projected monthly avg', formatCurrency(projected.totalMonthly), null));
    projGrid.appendChild(makeStatTile('Projected quarterly avg', formatCurrency(projected.totalQuarterly), null));
    projectedCard.appendChild(projGrid);

    const details = el('details', { class: 'table-toggle' });
    details.appendChild(el('summary', { text: 'View by holding' }));
    const table = el('table');
    table.appendChild(el('thead', {}, el('tr', {}, [
      el('th', { text: 'Account' }), el('th', { text: 'Symbol' }), el('th', { text: 'Shares' }),
      el('th', { text: 'Annual div/share' }), el('th', { text: 'Projected annual' }),
    ])));
    const tbody = el('tbody');
    projected.rows.forEach((r) => {
      tbody.appendChild(el('tr', {}, [
        el('td', {}, el('span', { class: 'account-tag', text: r.account })),
        el('td', { text: r.symbol }),
        el('td', { text: r.shares }),
        el('td', { text: formatCurrency(r.divRate) }),
        el('td', { text: formatCurrency(r.annual) }),
      ]));
    });
    table.appendChild(tbody);
    details.appendChild(el('div', { class: 'table-scroll' }, table));
    projectedCard.appendChild(details);
  }
  root.appendChild(projectedCard);

  const formCard = el('div', { class: 'card' });
  formCard.appendChild(el('h2', { text: 'Log a dividend payment' }));
  const form = el('form', { class: 'inline-form' });
  const dateField = el('div', { class: 'field' }, [el('label', { text: 'Date' }), el('input', { id: 'd-date', type: 'date', value: todayStr() })]);
  const accountField = el('div', { class: 'field' }, [
    el('label', { text: 'Account' }),
    el('input', { id: 'd-account', type: 'text', list: 'dividend-account-suggestions', placeholder: 'Robinhood Individual', value: 'Robinhood' }),
  ]);
  const accountDatalist = el('datalist', { id: 'dividend-account-suggestions' });
  getKnownAccounts(state).forEach((acc) => accountDatalist.appendChild(el('option', { value: acc })));
  const symbolField = el('div', { class: 'field' }, [el('label', { text: 'Symbol' }), el('input', { id: 'd-symbol', type: 'text', placeholder: 'AAPL' })]);
  const amountField = el('div', { class: 'field' }, [el('label', { text: 'Amount' }), el('input', { id: 'd-amount', type: 'number', step: 'any', min: '0', placeholder: '4.32' })]);
  const btnField = el('div', { class: 'field' });
  btnField.appendChild(el('button', { class: 'btn', type: 'submit', text: 'Add dividend' }));

  form.appendChild(dateField);
  form.appendChild(accountField);
  form.appendChild(accountDatalist);
  form.appendChild(symbolField);
  form.appendChild(amountField);
  form.appendChild(btnField);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const date = document.getElementById('d-date').value || todayStr();
    const account = document.getElementById('d-account').value.trim() || 'Other';
    const symbol = document.getElementById('d-symbol').value.trim().toUpperCase();
    const amount = parseFloat(document.getElementById('d-amount').value);
    if (!symbol || !isFinite(amount)) { alert('Please fill in symbol and amount.'); return; }
    state.dividends.push({ id: uid(), date, account, symbol, amount });
    saveState(state);
    renderDividends(state);
  });

  formCard.appendChild(form);
  root.appendChild(formCard);

  const importCard = el('div', { class: 'card' });
  importCard.appendChild(el('h2', { text: 'Bulk import via CSV' }));
  const btnRow = el('div', { class: 'btn-row' });
  const templateBtn = el('button', { class: 'btn secondary', type: 'button', text: 'Download CSV template' });
  templateBtn.addEventListener('click', () => {
    downloadFile('dividends-template.csv', 'Account,Date,Symbol,Amount\nRobinhood,2026-01-15,AAPL,4.32\nM1 Finance,2026-02-01,VTI,12.10\n', 'text/csv');
  });
  const fileInput = el('input', { type: 'file', accept: '.csv' });
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const rows = parseCSV(await file.text());
    let imported = 0;
    for (const row of rows) {
      const account = getField(row, ['account', 'broker', 'brokerage']);
      const date = getField(row, ['date', 'paydate', 'paymentdate']);
      const symbol = getField(row, ['symbol', 'ticker']);
      const amount = toNumber(getField(row, ['amount', 'dividend', 'total', 'value']));
      if (!date || !symbol || !isFinite(amount)) continue;
      state.dividends.push({ id: uid(), date, account: account || 'Other', symbol: symbol.toUpperCase(), amount });
      imported++;
    }
    saveState(state);
    renderDividends(state);
    fileInput.value = '';
    alert(`Imported ${imported} dividend record(s).`);
  });
  btnRow.appendChild(templateBtn);
  btnRow.appendChild(fileInput);
  importCard.appendChild(btnRow);
  root.appendChild(importCard);

  const chartCard = el('div', { class: 'card' });
  chartCard.appendChild(el('h2', { text: 'Dividends by month (last 12 months)' }));
  if (!state.dividends.length) {
    chartCard.appendChild(el('div', { class: 'empty-state', text: 'No dividends logged yet.' }));
  } else {
    const chartDiv = el('div');
    chartCard.appendChild(chartDiv);
    drawBarChart(chartDiv, { data: stats.byMonth.map((m) => ({ label: formatMonthLabel(m.month), value: m.amount })) });

    const details = el('details', { class: 'table-toggle' });
    details.appendChild(el('summary', { text: 'View as table' }));
    const table = el('table');
    table.appendChild(el('thead', {}, el('tr', {}, [el('th', { text: 'Month' }), el('th', { text: 'Amount' })])));
    const tbody = el('tbody');
    [...stats.byMonth].reverse().forEach((m) => {
      tbody.appendChild(el('tr', {}, [el('td', { text: m.month }), el('td', { text: formatCurrency(m.amount) })]));
    });
    table.appendChild(tbody);
    details.appendChild(el('div', { class: 'table-scroll' }, table));
    chartCard.appendChild(details);
  }
  root.appendChild(chartCard);

  const historyCard = el('div', { class: 'card' });
  historyCard.appendChild(el('h2', { text: 'Dividend history' }));
  if (!state.dividends.length) {
    historyCard.appendChild(el('div', { class: 'empty-state', text: 'No dividends logged yet.' }));
  } else {
    const table = el('table');
    table.appendChild(el('thead', {}, el('tr', {}, [
      el('th', { text: 'Date' }), el('th', { text: 'Account' }), el('th', { text: 'Symbol' }), el('th', { text: 'Amount' }), el('th', { text: '' }),
    ])));
    const tbody = el('tbody');
    [...state.dividends].sort((a, b) => b.date.localeCompare(a.date)).forEach((d) => {
      const delBtn = el('button', { class: 'link-btn danger', text: 'Delete' });
      delBtn.addEventListener('click', () => {
        state.dividends = state.dividends.filter((x) => x.id !== d.id);
        saveState(state);
        renderDividends(state);
      });
      tbody.appendChild(el('tr', {}, [
        el('td', { text: d.date }),
        el('td', {}, el('span', { class: 'account-tag', text: d.account })),
        el('td', { text: d.symbol }),
        el('td', { text: formatCurrency(d.amount) }),
        el('td', { class: 'actions-cell' }, delBtn),
      ]));
    });
    table.appendChild(tbody);
    historyCard.appendChild(el('div', { class: 'table-scroll' }, table));
  }
  root.appendChild(historyCard);
}
