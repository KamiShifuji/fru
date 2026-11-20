(function () {
  const el = document.getElementById('chart-data');
  if (!el || typeof Chart === 'undefined') return;
  const data = JSON.parse(el.textContent);
  Chart.defaults.color = '#9aa3b2';
  Chart.defaults.borderColor = '#2a3040';
  Chart.defaults.font.family = '"Segoe UI", system-ui, sans-serif';
  const grid = { color: '#1f2430' };

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
    const cols = data.causes.labels.map(l => l.startsWith('P3') ? '#9b6bdb' : (l.startsWith('P2') || l.startsWith('Zwischen')) ? '#5b9bd5' : l.startsWith('P1') ? '#e07a5f' : '#6b7382');
    new Chart(causes, {
      type: 'bar',
      data: { labels: data.causes.labels, datasets: [{ label: 'Wipes', data: data.causes.values, backgroundColor: cols, borderWidth: 0 }] },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: grid, ticks: { precision: 0 } }, y: { grid: { display: false } } }
      }
    });
  }
})();
