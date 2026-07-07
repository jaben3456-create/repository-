let editingPositionId = null;

function renderHoldings(state) {
  const root = document.getElementById('tab-holdings');
  root.innerHTML = '';

  root.appendChild(renderSyncCard(state, { onDone: () => { renderHoldings(state); renderDashboard(state); } }));
  root.appendChild(renderRobinhoodCard(state, { onDone: () => { renderHoldings(state); renderDashboard(state); } }));

  const formCard = el('div', { class: 'card' });
  formCard.appendChild(el('h2', { text: 'Add / edit a position' }));
  formCard.appendChild(el('p', { class: 'card-sub', text: 'Enter shares, average cost, and the current price. Update the price whenever you check your brokerage so daily returns stay accurate.' }));

  const form = el('form', { class: 'inline-form' });
  const editing = state.positions.find((p) => p.id === editingPositionId);

  const accountField = el('div', { class: 'field' }, [
    el('label', { text: 'Account' }),
    (() => {
      const sel = el('select', { id: 'f-account' });
      ['Robinhood', 'M1 Finance', 'Other'].forEach((opt) => {
        const o = el('option', { value: opt, text: opt });
        if (editing && editing.account === opt) o.selected = true;
        sel.appendChild(o);
      });
      if (editing && !['Robinhood', 'M1 Finance'].includes(editing.account)) {
        sel.value = 'Other';
      }
      return sel;
    })(),
  ]);

  const symbolField = el('div', { class: 'field' }, [
    el('label', { text: 'Symbol' }),
    el('input', { id: 'f-symbol', type: 'text', placeholder: 'AAPL', value: editing ? editing.symbol : '' }),
  ]);
  const sharesField = el('div', { class: 'field' }, [
    el('label', { text: 'Shares' }),
    el('input', { id: 'f-shares', type: 'number', step: 'any', min: '0', placeholder: '10', value: editing ? editing.shares : '' }),
  ]);
  const avgCostField = el('div', { class: 'field' }, [
    el('label', { text: 'Avg cost / share' }),
    el('input', { id: 'f-avgcost', type: 'number', step: 'any', min: '0', placeholder: '150.00', value: editing ? editing.avgCost : '' }),
  ]);
  const priceField = el('div', { class: 'field' }, [
    el('label', { text: 'Current price / share' }),
    el('input', { id: 'f-price', type: 'number', step: 'any', min: '0', placeholder: '175.00', value: editing ? editing.price : '' }),
  ]);

  form.appendChild(accountField);
  form.appendChild(symbolField);
  form.appendChild(sharesField);
  form.appendChild(avgCostField);
  form.appendChild(priceField);

  const btnField = el('div', { class: 'field' });
  const submitBtn = el('button', { class: 'btn', type: 'submit', text: editing ? 'Save changes' : 'Add position' });
  btnField.appendChild(submitBtn);
  if (editing) {
    const cancelBtn = el('button', { class: 'btn secondary', type: 'button', text: 'Cancel' });
    cancelBtn.style.marginLeft = '8px';
    cancelBtn.addEventListener('click', () => { editingPositionId = null; renderHoldings(state); });
    btnField.appendChild(cancelBtn);
  }
  form.appendChild(btnField);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const account = document.getElementById('f-account').value;
    const symbol = document.getElementById('f-symbol').value.trim().toUpperCase();
    const shares = parseFloat(document.getElementById('f-shares').value);
    const avgCost = parseFloat(document.getElementById('f-avgcost').value);
    const price = parseFloat(document.getElementById('f-price').value);
    if (!symbol || !isFinite(shares) || !isFinite(avgCost) || !isFinite(price)) {
      alert('Please fill in symbol, shares, avg cost, and current price with valid numbers.');
      return;
    }
    if (editing) {
      Object.assign(editing, { account, symbol, shares, avgCost, price, updatedAt: todayStr() });
    } else {
      state.positions.push({ id: uid(), account, symbol, shares, avgCost, price, updatedAt: todayStr() });
    }
    editingPositionId = null;
    recordSnapshot(state);
    saveState(state);
    renderHoldings(state);
    renderDashboard(state);
  });

  formCard.appendChild(form);
  root.appendChild(formCard);

  const importCard = el('div', { class: 'card' });
  importCard.appendChild(el('h2', { text: 'Bulk import via CSV' }));
  importCard.appendChild(el('p', { class: 'card-sub', text: "Robinhood and M1 don't offer an official positions-export file, so this app defines its own simple CSV format. Download the template, fill it in with your holdings (copy from either app), then import. Re-importing a symbol you already have updates it in place instead of creating a duplicate — see \"Quick re-import\" below for a faster way to do that for M1." }));

  const btnRow = el('div', { class: 'btn-row' });
  const templateBtn = el('button', { class: 'btn secondary', type: 'button', text: 'Download CSV template' });
  templateBtn.addEventListener('click', () => {
    downloadFile('positions-template.csv', 'Account,Symbol,Shares,AvgCost,CurrentPrice\nRobinhood,AAPL,10,150.00,175.00\nM1 Finance,VTI,5,210.00,225.00\n', 'text/csv');
  });
  const fileInput = el('input', { type: 'file', accept: '.csv', id: 'positions-file' });
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const rows = parseCSV(text);
    let added = 0;
    let updated = 0;
    for (const row of rows) {
      const account = getField(row, ['account', 'broker', 'brokerage']) || 'Other';
      const symbol = getField(row, ['symbol', 'ticker']);
      const shares = toNumber(getField(row, ['shares', 'quantity', 'qty', 'units']));
      const avgCost = toNumber(getField(row, ['avgcost', 'averagecost', 'costbasis', 'avgprice', 'averageprice', 'cost']));
      const price = toNumber(getField(row, ['price', 'currentprice', 'lastprice', 'marketprice']));
      if (!symbol || !isFinite(shares) || !isFinite(avgCost) || !isFinite(price)) continue;
      const upperSymbol = symbol.toUpperCase();
      const existing = state.positions.find((p) => p.account === account && p.symbol === upperSymbol);
      if (existing) {
        Object.assign(existing, { shares, avgCost, price, updatedAt: todayStr() });
        updated++;
      } else {
        state.positions.push({ id: uid(), account, symbol: upperSymbol, shares, avgCost, price, updatedAt: todayStr() });
        added++;
      }
    }
    recordSnapshot(state);
    saveState(state);
    renderHoldings(state);
    renderDashboard(state);
    fileInput.value = '';
    alert(`Added ${added} new position(s), updated ${updated} existing position(s).`);
  });
  btnRow.appendChild(templateBtn);
  btnRow.appendChild(fileInput);
  importCard.appendChild(btnRow);
  root.appendChild(importCard);

  const quickReimportCard = el('div', { class: 'card' });
  quickReimportCard.appendChild(el('h2', { text: 'Quick re-import (M1 Finance)' }));
  quickReimportCard.appendChild(el('p', { class: 'card-sub', text: "Since M1 can't sync automatically, this exports your current M1 holdings as a CSV pre-filled with what's already in the tracker — open it, update shares/prices from the M1 app, save, then import it back above. No new secrets, no network calls; it's just a file on your device." }));
  const quickBtnRow = el('div', { class: 'btn-row' });
  const exportM1Btn = el('button', { class: 'btn secondary', type: 'button', text: 'Export current M1 holdings as CSV' });
  exportM1Btn.addEventListener('click', () => {
    const m1Positions = state.positions.filter((p) => p.account === 'M1 Finance');
    if (!m1Positions.length) {
      alert('No M1 Finance positions yet. Add some manually above first, then use this button to quickly re-export/re-import updates going forward.');
      return;
    }
    const lines = m1Positions.map((p) => `M1 Finance,${p.symbol},${p.shares},${p.avgCost},${p.price}`);
    downloadFile(`m1-holdings-${todayStr()}.csv`, ['Account,Symbol,Shares,AvgCost,CurrentPrice', ...lines].join('\n'), 'text/csv');
  });
  quickBtnRow.appendChild(exportM1Btn);
  quickReimportCard.appendChild(quickBtnRow);
  root.appendChild(quickReimportCard);

  const positionsCard = el('div', { class: 'card' });
  positionsCard.appendChild(el('h2', { text: 'Your positions' }));
  if (!state.positions.length) {
    positionsCard.appendChild(el('div', { class: 'empty-state', text: 'No positions yet — add one above or import a CSV.' }));
  } else {
    const table = el('table');
    table.appendChild(el('thead', {}, el('tr', {}, [
      el('th', { text: 'Account' }), el('th', { text: 'Symbol' }), el('th', { text: 'Shares' }),
      el('th', { text: 'Avg cost' }), el('th', { text: 'Price' }), el('th', { text: 'Market value' }), el('th', { text: 'Actions' }),
    ])));
    const tbody = el('tbody');
    state.positions.forEach((p) => {
      const editBtn = el('button', { class: 'link-btn', text: 'Edit' });
      editBtn.addEventListener('click', () => { editingPositionId = p.id; renderHoldings(state); window.scrollTo({ top: 0, behavior: 'smooth' }); });
      const delBtn = el('button', { class: 'link-btn danger', text: 'Delete' });
      delBtn.addEventListener('click', () => {
        if (!confirm(`Delete ${p.symbol} (${p.account})?`)) return;
        state.positions = state.positions.filter((x) => x.id !== p.id);
        recordSnapshot(state);
        saveState(state);
        renderHoldings(state);
        renderDashboard(state);
      });
      tbody.appendChild(el('tr', {}, [
        el('td', {}, el('span', { class: 'account-tag', text: p.account })),
        el('td', { text: p.symbol }),
        el('td', { text: p.shares }),
        el('td', { text: formatCurrency(p.avgCost) }),
        el('td', { text: formatCurrency(p.price) }),
        el('td', { text: formatCurrency(p.shares * p.price) }),
        el('td', { class: 'actions-cell' }, [editBtn, delBtn]),
      ]));
    });
    table.appendChild(tbody);
    positionsCard.appendChild(el('div', { class: 'table-scroll' }, table));
  }
  root.appendChild(positionsCard);

  const backupCard = el('div', { class: 'card' });
  backupCard.appendChild(el('h2', { text: 'Backup & restore' }));
  backupCard.appendChild(el('p', { class: 'card-sub', text: 'Everything is stored only in this browser. Export a JSON backup to move your data to another browser/device, or before clearing site data.' }));
  const backupRow = el('div', { class: 'btn-row' });
  const exportBtn = el('button', { class: 'btn secondary', type: 'button', text: 'Export full backup (JSON)' });
  exportBtn.addEventListener('click', () => {
    downloadFile(`portfolio-tracker-backup-${todayStr()}.json`, JSON.stringify(state, null, 2), 'application/json');
  });
  const importInput = el('input', { type: 'file', accept: '.json' });
  importInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm('This will replace all current data with the backup file. Continue?')) { importInput.value = ''; return; }
    try {
      const parsed = JSON.parse(await file.text());
      Object.assign(state, defaultState(), parsed);
      saveState(state);
      renderAll(state);
      alert('Backup restored.');
    } catch (err) {
      alert('Could not read that file as a valid backup.');
    }
    importInput.value = '';
  });
  backupRow.appendChild(exportBtn);
  backupRow.appendChild(importInput);
  backupCard.appendChild(backupRow);
  root.appendChild(backupCard);
}
