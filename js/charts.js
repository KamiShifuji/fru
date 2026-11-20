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
  if (best) {
    const colors = data.bestPhase.map(p => p === 'P3' ? '#9b6bdb' : p === 'P2' ? '#5b9bd5' : '#e07a5f');
    new Chart(best, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Boss-HP des besten Pulls (niedriger = weiter, innerhalb derselben Phase)',
          data: data.bestBoss,
          borderColor: '#e0b15c',
          backgroundColor: 'rgba(224,177,92,.12)',
          tension: .2, spanGaps: true, pointRadius: 5, pointBackgroundColor: colors, pointBorderColor: '#090b10'
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#e8eaed' } },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                const i = ctx.dataIndex;
                const ph = data.bestPhase[i];
                const hp = ctx.raw;
                const hpTxt = (hp === null || hp === undefined) ? 'unbekannt' : (String(hp).replace('.', ',') + ' %');
                return ph + ' · ' + hpTxt + ' · Pull ' + data.bestPull[i];
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
