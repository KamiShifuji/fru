(function () {
  const el = document.getElementById('chart-data');
  if (!el || typeof Chart === 'undefined') return;
  const data = JSON.parse(el.textContent);
  Chart.defaults.color = '#9aa3b2';
  Chart.defaults.borderColor = '#2a3040';
  Chart.defaults.font.family = '"Segoe UI", system-ui, sans-serif';
  const grid = { color: '#1f2430' };

  const clear = document.getElementById('chartClear');
  if (clear && data.clearProg) {
    const phaseGuides = {
      id: 'phaseGuides',
      afterDraw: function (chart) {
        const y = chart.scales.y;
        const area = chart.chartArea;
        if (!y || !area) return;
        const ctx = chart.ctx;
        const marks = [
          [20, 'P2'],
          [40, 'P3'],
          [60, 'P4'],
          [80, 'P5'],
          [100, 'Clear']
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
          ctx.textBaseline = lab === 'Clear' ? 'top' : 'bottom';
          ctx.fillText(lab, area.right - 3, lab === 'Clear' ? py + 3 : py - 3);
        });
        ctx.restore();
      }
    };
    new Chart(clear, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Bester Pull – Fortschritt zum Clear',
          data: data.clearProg,
          borderColor: '#e0b15c',
          backgroundColor: 'rgba(224,177,92,.14)',
          tension: .25,
          fill: true,
          spanGaps: true,
          pointRadius: 5,
          pointBackgroundColor: '#e0b15c',
          pointBorderColor: '#090b10'
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
                return 'Fortschritt: ' + vTxt + (ph ? ' · ' + ph + ' · ' + hpTxt + ' (Pull ' + pu + ')' : '');
              }
            }
          }
        },
        scales: {
          y: { min: 0, max: 100, ticks: { callback: v => v + ' %' }, grid: grid, title: { display: true, text: 'Fortschritt zum Clear (höher = näher)' } },
          x: { grid: { display: false } }
        }
      },
      plugins: [phaseGuides]
    });
  }

  const prog = document.getElementById('chartProgress');
  if (prog) {
    new Chart(prog, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [
          { label: 'P2 erreicht %', data: data.p2, borderColor: '#5b9bd5', backgroundColor: 'rgba(91,155,213,.15)', tension: .25, fill: true, pointRadius: 4 },
          { label: 'P3 erreicht %', data: data.p3, borderColor: '#9b6bdb', backgroundColor: 'rgba(155,107,219,.18)', tension: .25, fill: true, pointRadius: 4 }
        ]
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
                const hpTxt = (hp === null || hp === undefined) ? 'kein Wert' : (String(hp).replace('.', ',') + ' %');
                return ctx.dataset.label + ' · niedrigste Boss-HP: ' + hpTxt;
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
  if (phase) {
    new Chart(phase, {
      type: 'doughnut',
      data: { labels: data.phase.labels, datasets: [{ data: data.phase.values, backgroundColor: data.phase.colors, borderColor: '#12151c', borderWidth: 2 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'right', labels: { color: '#e8eaed' } } }
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
