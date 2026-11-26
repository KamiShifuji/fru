(function () {
  const el = document.getElementById('chart-data');
  if (!el || typeof Chart === 'undefined') return;
  const data = JSON.parse(el.textContent);
  Chart.defaults.color = '#9aa3b2';
  Chart.defaults.borderColor = '#2a3040';
  Chart.defaults.font.family = '"Segoe UI", system-ui, sans-serif';
  const grid = { color: '#1f2430' };

  const clear = document.getElementById('chartClear');
  if (clear && data.clearRest) {
    let bestIdx = -1, bestVal = 101;
    data.clearRest.forEach(function (v, i) { if (v !== null && v !== undefined && v < bestVal) { bestVal = v; bestIdx = i; } });
    const BEST_COL = '#3dd6c6';
    const ptCol = data.clearRest.map(function (_, i) { return i === bestIdx ? BEST_COL : '#e0b15c'; });
    const ptRad = data.clearRest.map(function (_, i) { return i === bestIdx ? 9 : 5; });
    const ptBorder = data.clearRest.map(function (_, i) { return i === bestIdx ? '#ffffff' : '#090b10'; });
    const bestMark = {
      id: 'bestMark',
      afterDatasetsDraw: function (chart) {
        if (bestIdx < 0) return;
        const pt = chart.getDatasetMeta(0).data[bestIdx];
        if (!pt) return;
        const ctx = chart.ctx;
        const valTxt = String(bestVal).replace('.', ',') + ' %';
        const txt = (chart.width < 520) ? ('Rekord: noch ' + valTxt) : ('Rekord: noch ' + valTxt + ' (' + data.labels[bestIdx] + ')');
        ctx.save();
        ctx.font = '700 12px "Segoe UI", system-ui, sans-serif';
        const w = ctx.measureText(txt).width + 14;
        let x = pt.x - w / 2;
        x = Math.max(chart.chartArea.left, Math.min(x, chart.chartArea.right - w));
        const y = (pt.y + 34 > chart.chartArea.bottom - 4) ? pt.y - 34 : pt.y + 12;
        ctx.fillStyle = 'rgba(9,11,16,.85)';
        ctx.strokeStyle = BEST_COL;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        if (ctx.roundRect) { ctx.roundRect(x, y, w, 22, 6); } else { ctx.rect(x, y, w, 22); }
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = BEST_COL;
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(txt, x + 7, y + 11);
        ctx.restore();
      }
    };
    const phaseGuides = {
      id: 'phaseGuides',
      afterDraw: function (chart) {
        const y = chart.scales.y;
        const area = chart.chartArea;
        if (!y || !area) return;
        const ctx = chart.ctx;
        const marks = [
          [100, 'Start / P1'],
          [80, 'P2'],
          [60, 'P3'],
          [40, 'P4'],
          [20, 'P5'],
          [0, 'Clear']
        ];
        ctx.save();
        marks.forEach(function (m) {
          const v = m[0], lab = m[1];
          const py = y.getPixelForValue(v);
          if (py < area.top - 2 || py > area.bottom + 2) return;
          ctx.beginPath();
          ctx.setLineDash(lab === 'Clear' ? [6, 4] : [4, 4]);
          ctx.strokeStyle = lab === 'Clear' ? 'rgba(224,177,92,.65)' : 'rgba(255,255,255,.20)';
          ctx.lineWidth = lab === 'Clear' ? 1.4 : 1;
          ctx.moveTo(area.left, py);
          ctx.lineTo(area.right, py);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = lab === 'Clear' ? '#e0b15c' : '#9aa3b2';
          ctx.font = '600 11px "Segoe UI", system-ui, sans-serif';
          ctx.textAlign = 'right';
          const below = (lab === 'Start / P1');
          ctx.textBaseline = below ? 'top' : 'bottom';
          ctx.fillText(lab, area.right - 3, below ? py + 3 : py - 3);
        });
        ctx.restore();
      }
    };
    new Chart(clear, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Bester Pull – noch bis zum Clear',
          data: data.clearRest,
          borderColor: '#e0b15c',
          backgroundColor: 'rgba(224,177,92,.14)',
          tension: .25,
          fill: 'origin',
          spanGaps: true,
          pointRadius: ptRad,
          pointHoverRadius: ptRad.map(function (r) { return r + 2; }),
          pointBackgroundColor: ptCol,
          pointBorderColor: ptBorder,
          pointBorderWidth: ptRad.map(function (r) { return r > 5 ? 2.5 : 1; })
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        layout: { padding: { top: 4, right: 8 } },
        plugins: {
          legend: { labels: { color: '#e8eaed' } },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                const i = ctx.dataIndex;
                const v = ctx.raw;
                const vTxt = (v === null || v === undefined) ? 'kein Wert' : (String(v).replace('.', ',') + ' %');
                const ph = data.bestPhase[i];
                const hp = data.bestBoss[i];
                const pu = data.bestPull[i];
                const hpTxt = (hp === null || hp === undefined) ? 'Boss-HP unbekannt' : (String(hp).replace('.', ',') + ' %');
                return 'Noch bis zum Clear: ' + vTxt + (ph ? ' · ' + ph + ' · ' + hpTxt + ' (Pull ' + pu + ')' : '');
              }
            }
          }
        },
        scales: {
          y: { min: 0, max: 100, ticks: { callback: v => v + ' %' }, grid: grid, title: { display: true, text: 'Noch bis zum Clear (tiefer = näher)' } },
          x: { grid: { display: false } }
        }
      },
      plugins: [phaseGuides, bestMark]
    });
  }


  const sink = document.getElementById('chartSink');
  if (sink && data.phaseSink && data.phaseSink.order && data.phaseSink.order.length) {
    const sk = data.phaseSink;
    const minLbl = function (sec) {
      sec = Math.max(0, sec || 0);
      if (sec < 30) {
        const s = Math.round(sec);
        return s ? (s + ' s') : '0 min';
      }
      const m = sec / 60;
      const txt = (Math.round(m * 10) / 10).toFixed(1).replace(/\.0$/, '').replace('.', ',');
      return txt + ' min';
    };
    const dePct = function (v) { return String(Math.round(v * 10) / 10).replace('.', ',') + ' %'; };
    const sets = sk.order.map(function (lab) {
      return {
        label: lab,
        key: lab,
        data: sk.minutes[lab],
        backgroundColor: (sk.fills && sk.fills[lab]) || ((sk.colors && sk.colors[lab]) || '#e0b15c'),
        borderColor: (sk.colors && sk.colors[lab]) || '#e0b15c',
        borderWidth: 0,
        stack: 'phases',
        maxBarThickness: 42
      };
    });
    const maxMin = Math.max.apply(null, (sk.eveningSec || []).map(function (s) { return (s || 0) / 60; }).concat([0]));
    const sinkLabels = {
      id: 'sinkLabels',
      afterDatasetsDraw: function (chart) {
        const area = chart.chartArea;
        const x = chart.scales.x;
        const y = chart.scales.y;
        if (!area || !x || !y) return;
        const ctx = chart.ctx;
        ctx.save();
        ctx.font = '600 11px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        (sk.sink || []).forEach(function (lab, i) {
          if (!lab) return;
          const tot = (sk.eveningSec[i] || 0) / 60;
          if (tot <= 0) return;
          const px = x.getPixelForValue(i);
          const py = y.getPixelForValue(tot);
          const col = (sk.colors && sk.colors[lab]) || '#e8eaed';
          ctx.fillStyle = col;
          ctx.fillText(lab, px, Math.max(area.top + 2, py - 4));
        });
        ctx.restore();
      }
    };
    new Chart(sink, {
      type: 'bar',
      data: { labels: data.labels, datasets: sets },
      plugins: [sinkLabels],
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        layout: { padding: { top: 18 } },
        plugins: {
          legend: { labels: { color: '#e8eaed', boxWidth: 14 } },
          tooltip: {
            callbacks: {
              title: function (items) {
                if (!items.length) return '';
                const i = items[0].dataIndex;
                const sinkLab = sk.sink[i];
                return (data.labels[i] || '') + (sinkLab ? (' · Zeitfresser ' + sinkLab) : '');
              },
              label: function (item) {
                const lab = item.dataset.key;
                const i = item.dataIndex;
                const sec = (sk.seconds[lab] || [])[i] || 0;
                if (sec <= 0.05) return null;
                const tot = sk.eveningSec[i] || 0;
                const share = tot ? (100 * sec / tot) : ((sk.share[lab] || [])[i] || 0);
                const mark = (sk.sink[i] === lab) ? 'Zeitfresser · ' : '';
                return mark + lab + ': ' + minLbl(sec) + ' (' + dePct(share) + ')';
              }
            }
          }
        },
        scales: {
          y: {
            stacked: true,
            min: 0,
            suggestedMax: maxMin ? Math.ceil((maxMin * 1.12) / 10) * 10 : undefined,
            ticks: { callback: function (v) { return v + ' min'; } },
            grid: grid,
            title: { display: true, text: 'Minuten aktiver Kampfzeit' }
          },
          x: { stacked: true, grid: { display: false } }
        }
      }
    });
  }

  const best = document.getElementById('chartBest');
  if (best && data.phaseHp) {
    const colors = data.phaseHpColors || { P1: '#e07a5f', P2: '#5b9bd5', P3: '#9b6bdb', P4: '#e0b15c', P5: '#3dbe8c' };
    const fills = data.phaseHpFills || {};
    const order = ['P1', 'P2', 'P3', 'P4', 'P5'];
    const present = order.filter(function (ph) { return Object.prototype.hasOwnProperty.call(data.phaseHp, ph); });
    const legendTitle = present.join(' / ') + ' – niedrigste Boss-HP';
    const datasets = present.map(function (ph) {
      return {
        label: ph,
        data: data.phaseHp[ph],
        borderColor: colors[ph],
        backgroundColor: fills[ph] || 'transparent',
        tension: .2,
        spanGaps: false,
        fill: false,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: colors[ph],
        pointBorderColor: '#090b10'
      };
    });
    const phaseReachMarks = {
      id: 'phaseReachMarks',
      afterDraw: function (chart) {
        const marks = data.phaseHpMarks || [];
        if (!marks.length) return;
        const x = chart.scales.x;
        const area = chart.chartArea;
        if (!x || !area) return;
        const ctx = chart.ctx;
        ctx.save();
        marks.forEach(function (m, mi) {
          const px = x.getPixelForValue(m.index);
          if (px < area.left - 2 || px > area.right + 2) return;
          ctx.beginPath();
          ctx.setLineDash([5, 4]);
          ctx.strokeStyle = m.color || 'rgba(255,255,255,.28)';
          ctx.globalAlpha = 0.85;
          ctx.lineWidth = 1.2;
          ctx.moveTo(px, area.top);
          ctx.lineTo(px, area.bottom);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
          ctx.font = '600 11px "Segoe UI", system-ui, sans-serif';
          const txt = m.label;
          const tw = ctx.measureText(txt).width + 12;
          let lx = px - tw / 2;
          lx = Math.max(area.left + 1, Math.min(lx, area.right - tw - 1));
          let ty = area.top + 6 + (mi * 22);
          if (ty + 18 > area.bottom) ty = area.bottom - 20;
          ctx.fillStyle = 'rgba(9,11,16,.88)';
          ctx.strokeStyle = m.color || '#9aa3b2';
          ctx.lineWidth = 1;
          ctx.beginPath();
          if (ctx.roundRect) { ctx.roundRect(lx, ty, tw, 18, 5); } else { ctx.rect(lx, ty, tw, 18); }
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = m.color || '#9aa3b2';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(txt, lx + 6, ty + 9);
        });
        ctx.restore();
      }
    };
    new Chart(best, {
      type: 'line',
      data: { labels: data.labels, datasets: datasets },
      plugins: [phaseReachMarks],
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          title: { display: true, text: legendTitle, color: '#e8eaed', font: { size: 13, weight: '600' } },
          legend: { labels: { color: '#e8eaed' } },
          tooltip: {
            filter: function (ctx) {
              return ctx.raw !== null && ctx.raw !== undefined;
            },
            callbacks: {
              title: function (items) {
                return items.length ? items[0].label : '';
              },
              label: function (ctx) {
                const hp = ctx.raw;
                if (hp === null || hp === undefined) return null;
                const hpTxt = String(hp).replace('.', ',') + ' %';
                return ctx.dataset.label + ' · ' + hpTxt;
              }
            }
          }
        },
        scales: {
          y: { reverse: true, min: 0, max: 100, ticks: { callback: v => v + ' %' }, grid: grid, title: { display: true, text: 'verbleibende Boss-HP (umgekehrt)' } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  const avoid = document.getElementById('chartAvoid');
  if (avoid && data.avoidable && data.avoidable.order && data.avoidable.order.length) {
    const av = data.avoidable;
    const cols = {
      apoc: '#9b6bdb', feuga: '#e07a5f', eruption: '#d46aa8',
      spirit: '#5b9bd5', icicle: '#6ec9d1', bow: '#e0b15c'
    };
    const sets = av.order.map(function (k) {
      return {
        label: av.names[k] || k,
        data: av.hits[k] || [],
        backgroundColor: cols[k] || '#6b7382',
        borderWidth: 0,
        stack: 'av'
      };
    });
    new Chart(avoid, {
      type: 'bar',
      data: { labels: data.labels, datasets: sets },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: '#e8eaed', boxWidth: 14 } },
          tooltip: {
            callbacks: {
              footer: function (items) {
                if (!items.length) return '';
                const i = items[0].dataIndex;
                const sum = av.order.reduce(function (s, k) {
                  return s + ((av.hits[k] || [])[i] || 0);
                }, 0);
                return 'Summe: ' + sum + ' vermeidbare Treffer';
              }
            }
          }
        },
        scales: {
          y: { stacked: true, min: 0, ticks: { precision: 0 }, grid: grid, title: { display: true, text: 'vermeidbare Treffer' } },
          x: { stacked: true, grid: { display: false } }
        }
      }
    });
  }

  const deaths = document.getElementById('chartDeaths');
  if (deaths) {
    new Chart(deaths, {
      type: 'bar',
      data: { labels: data.deaths.labels, datasets: [{ label: 'Einzeltode pro 10 Pulls', data: data.deaths.values, backgroundColor: data.deaths.colors, borderWidth: 0 }] },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: grid, title: { display: true, text: 'pro 10 Pulls' } }, y: { grid: { display: false } } }
      }
    });
  }

  const causes = document.getElementById('chartCauses');
  if (causes) {
    const causeKey = function (l) {
      return Array.isArray(l) ? l.join(' ') : String(l);
    };
    const cols = data.causes.labels.map(function (l) {
      const s = causeKey(l);
      return s.startsWith('P3') ? '#9b6bdb' : (s.startsWith('P2') || s.startsWith('Zwischen')) ? '#5b9bd5' : s.startsWith('P1') ? '#e07a5f' : '#6b7382';
    });
    new Chart(causes, {
      type: 'bar',
      data: { labels: data.causes.labels, datasets: [{ label: 'Wipes', data: data.causes.values, backgroundColor: cols, borderWidth: 0 }] },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: grid, ticks: { precision: 0 } },
          y: { grid: { display: false }, ticks: { autoSkip: false, font: { size: 11 } } }
        }
      }
    });
  }
})();
