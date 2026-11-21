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

  const prog = document.getElementById('chartProgress');
  if (prog) {
    const reach = data.reach || { P2: data.p2, P3: data.p3 };
    const reachOrder = data.reachOrder || Object.keys(reach);
    const reachColors = data.reachColors || { P2: '#5b9bd5', P3: '#9b6bdb', P4: '#e0b15c', P5: '#3dbe8c', Clear: '#f3e6b8' };
    const reachFills = data.reachFills || { P2: 'rgba(91,155,213,.15)', P3: 'rgba(155,107,219,.18)', P4: 'rgba(224,177,92,.18)', P5: 'rgba(61,190,140,.18)', Clear: 'rgba(243,230,184,.18)' };
    const reachSets = reachOrder.filter(function (lab) { return reach[lab]; }).map(function (lab) {
      return {
        label: lab + ' erreicht %',
        data: reach[lab],
        borderColor: reachColors[lab] || '#e0b15c',
        backgroundColor: reachFills[lab] || 'rgba(224,177,92,.18)',
        tension: .25,
        fill: true,
        pointRadius: 4
      };
    });
    new Chart(prog, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: reachSets
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: '#e8eaed' } },
          tooltip: {
            callbacks: {
              afterBody: function (items) {
                const i = items[0].dataIndex;
                const ph = data.bestPhase[i], hp = data.bestBoss[i], pu = data.bestPull[i];
                if (!ph) return '';
                const hpTxt = (hp === null || hp === undefined) ? 'Boss-HP unbekannt' : (String(hp).replace('.', ',') + ' %');
                return 'Bester Pull: ' + ph + ' · ' + hpTxt + ' (Pull ' + pu + ')';
              }
            }
          }
        },
        scales: {
          y: { min: 0, max: 100, ticks: { callback: v => v + ' %' }, grid: grid, title: { display: true, text: 'Anteil der Pulls' } },
          x: { grid: { display: false } }
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
        pointBackgroundColor: colors[ph],
        pointBorderColor: '#090b10'
      };
    });
    new Chart(best, {
      type: 'line',
      data: { labels: data.labels, datasets: datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          title: { display: true, text: legendTitle, color: '#e8eaed', font: { size: 13, weight: '600' } },
          legend: { labels: { color: '#e8eaed' } },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                const hp = ctx.raw;
                const ph = ctx.dataset.label;
                const rank = {P1: 1, P2: 2, P3: 3, P4: 4, P5: 5};
                const i = ctx.dataIndex;
                const later = present.some(function (other) {
                  return (rank[other] || 0) > (rank[ph] || 0)
                    && data.phaseHp[other] && data.phaseHp[other][i] !== null && data.phaseHp[other][i] !== undefined;
                });
                if (hp === 0 && later) {
                  return ph + ' · 0 % (Phase an dem Abend geschafft)';
                }
                const hpTxt = (hp === null || hp === undefined) ? 'kein Wert' : (String(hp).replace('.', ',') + ' %');
                return ph + ' · niedrigste Boss-HP: ' + hpTxt;
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

  const phase = document.getElementById('chartPhase');
  if (phase && data.progDur && data.progDur.length) {
    const rows = data.progDur;
    const progDurLabels = {
      id: 'progDurLabels',
      afterDatasetsDraw: function (chart) {
        const meta = chart.getDatasetMeta(0);
        const ctx = chart.ctx;
        const area = chart.chartArea;
        if (!meta || !area) return;
        ctx.save();
        ctx.font = '700 12px "Segoe UI", system-ui, sans-serif';
        ctx.textBaseline = 'middle';
        meta.data.forEach(function (bar, i) {
          const row = rows[i];
          if (!row || !bar) return;
          const txt = row.pulls + ' Pulls';
          const tw = ctx.measureText(txt).width;
          const x0 = Math.min(bar.x, bar.base);
          const x1 = Math.max(bar.x, bar.base);
          const mid = (x0 + x1) / 2;
          const y = bar.y;
          if (x1 - x0 > tw + 16) {
            ctx.fillStyle = '#14161c';
            ctx.textAlign = 'center';
            ctx.fillText(txt, mid, y);
          } else {
            ctx.fillStyle = '#e8eaed';
            let tx = x1 + 8;
            if (tx + tw <= area.right - 2) {
              ctx.textAlign = 'left';
              ctx.fillText(txt, tx, y);
            } else if (x0 - 8 - tw >= area.left) {
              ctx.textAlign = 'right';
              ctx.fillText(txt, x0 - 8, y);
            }
          }
        });
        ctx.restore();
      }
    };
    const maxH = Math.max.apply(null, rows.map(function (r) { return r.end_h; }));
    new Chart(phase, {
      type: 'bar',
      data: {
        labels: rows.map(function (r) { return r.phase; }),
        datasets: [{
          label: 'Prog-Dauer',
          data: rows.map(function (r) { return [r.start_h, r.end_h]; }),
          backgroundColor: rows.map(function (r) { return r.color; }),
          borderWidth: 0,
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.62,
          categoryPercentage: 0.8
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: function (items) {
                return rows[items[0].dataIndex].phase;
              },
              label: function (ctx) {
                const r = rows[ctx.dataIndex];
                const lines = [r.dur_label, r.pulls + ' Pulls'];
                if (r.dates) lines.push(r.dates);
                return lines;
              }
            }
          }
        },
        scales: {
          x: {
            min: 0,
            suggestedMax: Math.max(1, Math.ceil(maxH * 2) / 2),
            grid: grid,
            title: { display: true, text: 'Stunden aktiver Kampfzeit', color: '#9aa3b2' },
            ticks: { callback: function (v) { return String(v).replace('.', ',') + ' h'; } }
          },
          y: {
            grid: { display: false },
            ticks: { color: '#e8eaed', font: { weight: '700', size: 13 } }
          }
        }
      },
      plugins: [progDurLabels]
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
