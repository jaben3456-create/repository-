const CATEGORICAL = [
  { name: 'blue', light: '#2a78d6', dark: '#3987e5' },
  { name: 'aqua', light: '#1baf7a', dark: '#199e70' },
  { name: 'yellow', light: '#eda100', dark: '#c98500' },
  { name: 'green', light: '#008300', dark: '#008300' },
  { name: 'violet', light: '#4a3aa7', dark: '#9085e9' },
  { name: 'red', light: '#e34948', dark: '#e66767' },
  { name: 'magenta', light: '#e87ba4', dark: '#d55181' },
  { name: 'orange', light: '#eb6834', dark: '#d95926' },
];

function isDarkMode() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function seriesColor(index) {
  const slot = CATEGORICAL[index % CATEGORICAL.length];
  return isDarkMode() ? slot.dark : slot.light;
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function getTooltip() {
  let tip = document.getElementById('chart-tooltip');
  if (!tip) {
    tip = el('div', { id: 'chart-tooltip', class: 'chart-tooltip' });
    document.body.appendChild(tip);
  }
  return tip;
}

function showTooltip(clientX, clientY, html) {
  const tip = getTooltip();
  tip.innerHTML = html;
  tip.style.display = 'block';
  const pad = 14;
  let x = clientX + pad;
  let y = clientY + pad;
  const rect = tip.getBoundingClientRect();
  if (x + rect.width > window.innerWidth - 8) x = clientX - rect.width - pad;
  if (y + rect.height > window.innerHeight - 8) y = clientY - rect.height - pad;
  tip.style.left = `${x}px`;
  tip.style.top = `${y}px`;
}

function hideTooltip() {
  const tip = document.getElementById('chart-tooltip');
  if (tip) tip.style.display = 'none';
}

function roundedTopBarPath(x, yTop, width, yBase, radius) {
  const r = Math.min(radius, width / 2, Math.max(yBase - yTop, 0));
  if (yBase - yTop < 1) return `M${x},${yBase} L${x + width},${yBase} Z`;
  return `M${x},${yBase}
    L${x},${yTop + r}
    Q${x},${yTop} ${x + r},${yTop}
    L${x + width - r},${yTop}
    Q${x + width},${yTop} ${x + width},${yTop + r}
    L${x + width},${yBase}
    Z`;
}

function emptyState(container, message) {
  container.innerHTML = '';
  container.appendChild(el('div', { class: 'empty-state', text: message }));
}

function drawLineChart(container, { series, xLabels, valueFormat = formatCompactCurrency, tooltipFormat = formatCurrency, forceZero = false }) {
  container.innerHTML = '';
  if (!xLabels.length) return;

  const VB_W = 800;
  const VB_H = 300;
  const pad = { top: 20, right: series.length <= 2 ? 58 : 16, bottom: 30, left: 64 };
  const plotW = VB_W - pad.left - pad.right;
  const plotH = VB_H - pad.top - pad.bottom;

  const allValues = series.flatMap((s) => s.values);
  const { min, max, ticks } = niceTicks(Math.min(...allValues), Math.max(...allValues), 5, forceZero);
  const yScale = (v) => pad.top + plotH - ((v - min) / (max - min || 1)) * plotH;
  const xScale = (i) => pad.left + (xLabels.length > 1 ? (i / (xLabels.length - 1)) * plotW : plotW / 2);

  const svg = svgEl('svg', { viewBox: `0 0 ${VB_W} ${VB_H}`, style: 'width:100%;height:auto;display:block', role: 'img', 'aria-label': 'Line chart' });

  const gridline = cssVar('--gridline') || '#e1e0d9';
  const mutedInk = cssVar('--text-muted') || '#898781';
  const surface = cssVar('--surface-1') || '#fcfcfb';

  for (const t of ticks) {
    const y = yScale(t);
    svg.appendChild(svgEl('line', { x1: pad.left, x2: VB_W - pad.right, y1: y, y2: y, stroke: gridline, 'stroke-width': 1 }));
    const label = svgEl('text', { x: pad.left - 10, y: y + 4, 'text-anchor': 'end', class: 'chart-axis-label' });
    label.textContent = valueFormat(t);
    label.setAttribute('fill', mutedInk);
    svg.appendChild(label);
  }

  const stepLabels = xLabels.length <= 8 ? 1 : Math.ceil(xLabels.length / 8);
  xLabels.forEach((lab, i) => {
    if (i % stepLabels !== 0 && i !== xLabels.length - 1) return;
    const t = svgEl('text', { x: xScale(i), y: VB_H - 6, 'text-anchor': 'middle', class: 'chart-axis-label' });
    t.textContent = lab;
    t.setAttribute('fill', mutedInk);
    svg.appendChild(t);
  });

  series.forEach((s, sIdx) => {
    const color = s.color || seriesColor(sIdx);
    if (series.length === 1) {
      const areaPts = s.values.map((v, i) => `${xScale(i)},${yScale(v)}`).join(' ');
      const areaPath = `M${xScale(0)},${yScale(min)} L${areaPts.split(' ').join(' L')} L${xScale(s.values.length - 1)},${yScale(min)} Z`;
      svg.appendChild(svgEl('path', { d: areaPath, fill: color, opacity: 0.1, stroke: 'none' }));
    }
    const linePts = s.values.map((v, i) => `${xScale(i)},${yScale(v)}`).join(' L');
    svg.appendChild(svgEl('path', { d: `M${linePts}`, fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));

    const lastI = s.values.length - 1;
    svg.appendChild(svgEl('circle', { cx: xScale(lastI), cy: yScale(s.values[lastI]), r: 5, fill: color, stroke: surface, 'stroke-width': 2 }));

    if (series.length <= 2) {
      const labelText = svgEl('text', {
        x: xScale(lastI) + 8,
        y: yScale(s.values[lastI]) + (sIdx === 0 ? -8 : 14),
        class: 'chart-end-label',
      });
      labelText.textContent = valueFormat(s.values[lastI]);
      labelText.setAttribute('fill', cssVar('--text-secondary') || '#52514e');
      svg.appendChild(labelText);
    }
  });

  const hoverGroup = svgEl('g', { style: 'display:none' });
  const hoverLine = svgEl('line', { y1: pad.top, y2: pad.top + plotH, stroke: mutedInk, 'stroke-width': 1 });
  hoverGroup.appendChild(hoverLine);
  const hoverDots = series.map((s, i) => svgEl('circle', { r: 5, fill: s.color || seriesColor(i), stroke: surface, 'stroke-width': 2 }));
  hoverDots.forEach((d) => hoverGroup.appendChild(d));
  svg.appendChild(hoverGroup);

  const overlay = svgEl('rect', { x: pad.left, y: pad.top, width: plotW, height: plotH, fill: 'transparent', style: 'cursor:crosshair' });
  overlay.addEventListener('mousemove', (evt) => {
    const rect = svg.getBoundingClientRect();
    const scaleX = VB_W / rect.width;
    const xInVb = (evt.clientX - rect.left) * scaleX;
    let idx = Math.round(((xInVb - pad.left) / plotW) * (xLabels.length - 1));
    idx = Math.max(0, Math.min(xLabels.length - 1, idx));
    hoverGroup.style.display = 'block';
    hoverLine.setAttribute('x1', xScale(idx));
    hoverLine.setAttribute('x2', xScale(idx));
    hoverDots.forEach((d, i) => {
      d.setAttribute('cx', xScale(idx));
      d.setAttribute('cy', yScale(series[i].values[idx]));
    });
    const rows = series.map((s, i) => `<div class="tt-row"><span class="tt-swatch" style="background:${s.color || seriesColor(i)}"></span>${s.name ? s.name + ': ' : ''}${tooltipFormat(s.values[idx])}</div>`).join('');
    showTooltip(evt.clientX, evt.clientY, `<div class="tt-title">${xLabels[idx]}</div>${rows}`);
  });
  overlay.addEventListener('mouseleave', () => { hoverGroup.style.display = 'none'; hideTooltip(); });
  svg.appendChild(overlay);

  container.appendChild(svg);

  if (series.length > 1) {
    const legend = el('div', { class: 'chart-legend' });
    series.forEach((s, i) => {
      legend.appendChild(el('div', { class: 'legend-item' }, [
        el('span', { class: 'legend-swatch', style: `background:${s.color || seriesColor(i)}` }),
        el('span', { text: s.name }),
      ]));
    });
    container.appendChild(legend);
  }
}

function drawBarChart(container, { data, color, valueFormat = formatCompactCurrency, tooltipFormat = formatCurrency }) {
  container.innerHTML = '';
  if (!data.length) return;

  const VB_W = 800;
  const VB_H = 260;
  const pad = { top: 20, right: 16, bottom: 30, left: 64 };
  const plotW = VB_W - pad.left - pad.right;
  const plotH = VB_H - pad.top - pad.bottom;

  const maxVal = Math.max(...data.map((d) => d.value), 0);
  const { max, ticks } = niceTicks(0, maxVal, 4, true);
  const yScale = (v) => pad.top + plotH - (v / (max || 1)) * plotH;

  const n = data.length;
  const bandW = plotW / n;
  const barW = Math.min(24, bandW - 8);

  const svg = svgEl('svg', { viewBox: `0 0 ${VB_W} ${VB_H}`, style: 'width:100%;height:auto;display:block', role: 'img', 'aria-label': 'Bar chart' });
  const gridline = cssVar('--gridline') || '#e1e0d9';
  const mutedInk = cssVar('--text-muted') || '#898781';
  const barColor = color || seriesColor(0);

  for (const t of ticks) {
    const y = yScale(t);
    svg.appendChild(svgEl('line', { x1: pad.left, x2: VB_W - pad.right, y1: y, y2: y, stroke: gridline, 'stroke-width': 1 }));
    const label = svgEl('text', { x: pad.left - 10, y: y + 4, 'text-anchor': 'end', class: 'chart-axis-label' });
    label.textContent = valueFormat(t);
    label.setAttribute('fill', mutedInk);
    svg.appendChild(label);
  }

  const baseline = yScale(0);
  const maxIdx = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);

  data.forEach((d, i) => {
    const cx = pad.left + bandW * i + bandW / 2;
    const x = cx - barW / 2;
    const yTop = yScale(d.value);
    const path = svgEl('path', { d: roundedTopBarPath(x, yTop, barW, baseline, 4), fill: barColor });
    svg.appendChild(path);

    const hit = svgEl('rect', { x: pad.left + bandW * i, y: pad.top, width: bandW, height: plotH, fill: 'transparent', style: 'cursor:pointer' });
    hit.addEventListener('mousemove', (evt) => {
      showTooltip(evt.clientX, evt.clientY, `<div class="tt-title">${d.label}</div><div class="tt-row"><span class="tt-swatch" style="background:${barColor}"></span>${tooltipFormat(d.value)}</div>`);
    });
    hit.addEventListener('mouseleave', hideTooltip);
    svg.appendChild(hit);

    if (i === maxIdx && d.value > 0) {
      const label = svgEl('text', { x: cx, y: yTop - 8, 'text-anchor': 'middle', class: 'chart-bar-label' });
      label.textContent = valueFormat(d.value);
      label.setAttribute('fill', cssVar('--text-secondary') || '#52514e');
      svg.appendChild(label);
    }

    const xLabel = svgEl('text', { x: cx, y: VB_H - 8, 'text-anchor': 'middle', class: 'chart-axis-label' });
    xLabel.textContent = d.label;
    xLabel.setAttribute('fill', mutedInk);
    svg.appendChild(xLabel);
  });

  container.appendChild(svg);
}
