function renderProjection(state) {
  const root = document.getElementById('tab-projection');
  root.innerHTML = '';

  const holdings = computeHoldings(state);
  const totals = computeTotals(holdings);
  const currentValue = totals.total;

  const inputCard = el('div', { class: 'card' });
  inputCard.appendChild(el('h2', { text: 'Assumptions' }));
  inputCard.appendChild(el('p', { class: 'card-sub', text: 'Defaults to your current portfolio value, growing at 8% a year for 20 years — the long-run historical average for a diversified US stock portfolio. Edit any field to see the projection update.' }));

  const form = el('div', { class: 'inline-form' });
  const startVal = state.projection.startOverride != null ? state.projection.startOverride : currentValue;

  const startField = el('div', { class: 'field' }, [el('label', { text: 'Starting balance' }), el('input', { id: 'p-start', type: 'number', step: 'any', min: '0', value: startVal.toFixed(2) })]);
  const rateField = el('div', { class: 'field' }, [el('label', { text: 'Annual return %' }), el('input', { id: 'p-rate', type: 'number', step: 'any', value: state.projection.rate })]);
  const yearsField = el('div', { class: 'field' }, [el('label', { text: 'Years' }), el('input', { id: 'p-years', type: 'number', step: '1', min: '1', max: '60', value: state.projection.years })]);
  const contribField = el('div', { class: 'field' }, [el('label', { text: 'Annual contribution' }), el('input', { id: 'p-contribution', type: 'number', step: 'any', min: '0', value: state.projection.contribution })]);
  const resetField = el('div', { class: 'field' });
  const resetBtn = el('button', { class: 'btn secondary', type: 'button', text: 'Use current portfolio value' });
  resetField.appendChild(resetBtn);

  form.appendChild(startField);
  form.appendChild(rateField);
  form.appendChild(yearsField);
  form.appendChild(contribField);
  form.appendChild(resetField);
  inputCard.appendChild(form);
  root.appendChild(inputCard);

  const resultCard = el('div', { class: 'card' });
  root.appendChild(resultCard);

  function update() {
    const start = parseFloat(document.getElementById('p-start').value) || 0;
    const rate = parseFloat(document.getElementById('p-rate').value) || 0;
    const years = Math.max(1, Math.min(60, parseInt(document.getElementById('p-years').value, 10) || 1));
    const contribution = parseFloat(document.getElementById('p-contribution').value) || 0;

    state.projection.rate = rate;
    state.projection.years = years;
    state.projection.contribution = contribution;
    saveState(state);

    const rows = buildProjection({ start, rate, years, contribution });
    const final = rows[rows.length - 1];
    const totalContributed = final.contributed;
    const totalGrowth = final.balance - start - totalContributed;

    resultCard.innerHTML = '';
    resultCard.appendChild(el('h2', { text: `Projected value after ${years} years` }));
    resultCard.appendChild(el('div', { class: 'hero-figure', text: formatCurrency(final.balance) }));
    resultCard.appendChild(el('div', { class: 'hero-sub', text: `Starting from ${formatCurrency(start)}, growing at ${rate}%/year${contribution > 0 ? ` plus ${formatCurrency(contribution)}/year contributed` : ''}. That's ${formatCurrency(totalGrowth)} in compounding growth${contribution > 0 ? ` and ${formatCurrency(totalContributed)} in contributions` : ''}.` }));

    const chartDiv = el('div');
    resultCard.appendChild(chartDiv);
    drawLineChart(chartDiv, {
      series: [{ name: 'Projected balance', values: rows.map((r) => r.balance) }],
      xLabels: rows.map((r) => `Yr ${r.year}`),
      forceZero: true,
    });

    const details = el('details', { class: 'table-toggle' });
    details.appendChild(el('summary', { text: 'View year-by-year table' }));
    const table = el('table');
    table.appendChild(el('thead', {}, el('tr', {}, [el('th', { text: 'Year' }), el('th', { text: 'Contributed to date' }), el('th', { text: 'Balance' })])));
    const tbody = el('tbody');
    rows.forEach((r) => {
      tbody.appendChild(el('tr', {}, [el('td', { text: r.year }), el('td', { text: formatCurrency(r.contributed) }), el('td', { text: formatCurrency(r.balance) })]));
    });
    table.appendChild(tbody);
    details.appendChild(el('div', { class: 'table-scroll' }, table));
    resultCard.appendChild(details);
  }

  form.querySelector('#p-start').addEventListener('input', (e) => {
    state.projection.startOverride = parseFloat(e.target.value) || 0;
    saveState(state);
    update();
  });
  ['p-rate', 'p-years', 'p-contribution'].forEach((id) => {
    form.querySelector(`#${id}`).addEventListener('input', update);
  });
  resetBtn.addEventListener('click', () => {
    state.projection.startOverride = null;
    document.getElementById('p-start').value = currentValue.toFixed(2);
    saveState(state);
    update();
  });

  update();
}
