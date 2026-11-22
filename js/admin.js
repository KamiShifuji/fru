/* Admin-Entschlüsselung (WebCrypto: PBKDF2-SHA256 + AES-GCM). Keine Zugangsdaten im Klartext. */
(function () {
  const ITER_DEFAULT = 600000;
  const SS_KEY = 'fruAdminKey';

  function b64(s) {
    const bin = atob(s);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  }
  function b64enc(buf) {
    const u = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
    return btoa(s);
  }
  function enc(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }
  function deNum(v, d) {
    if (v === null || v === undefined || v === '') return '–';
    return String(Number(v).toLocaleString('de-DE', { minimumFractionDigits: d || 0, maximumFractionDigits: d == null ? 2 : d }));
  }
  function blob() {
    const el = document.getElementById('admin-blob');
    if (!el) throw new Error('missing');
    return JSON.parse(el.textContent);
  }

  async function derive(user, pass, salt, iter) {
    const raw = new TextEncoder().encode(user + ':' + pass);
    const base = await crypto.subtle.importKey('raw', raw, 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt, iterations: iter, hash: 'SHA-256' },
      base,
      { name: 'AES-GCM', length: 256 },
      true,
      ['decrypt']
    );
  }

  async function decryptWithKey(key, pack) {
    const iv = b64(pack.iv);
    const ct = b64(pack.ct);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ct);
    return JSON.parse(new TextDecoder().decode(pt));
  }

  async function unlock(user, pass) {
    const pack = blob();
    const iter = pack.iter || ITER_DEFAULT;
    const salt = b64(pack.salt);
    const key = await derive(user, pass, salt, iter);
    const data = await decryptWithKey(key, pack);
    const raw = await crypto.subtle.exportKey('raw', key);
    try { sessionStorage.setItem(SS_KEY, b64enc(raw)); } catch (e) {}
    return data;
  }

  async function fromSession() {
    let stored;
    try { stored = sessionStorage.getItem(SS_KEY); } catch (e) { return null; }
    if (!stored) return null;
    const pack = blob();
    const key = await crypto.subtle.importKey('raw', b64(stored), { name: 'AES-GCM' }, false, ['decrypt']);
    return decryptWithKey(key, pack);
  }

  function trendHtml(t, goodDown) {
    if (!t || t.late == null || t.early == null) return '–';
    const d = t.late - t.early;
    const cls = (goodDown ? d > 0.05 : d < -0.05) ? 'trend-up' : ((goodDown ? d < -0.05 : d > 0.05) ? 'trend-dn' : '');
    const arrow = d > 0.05 ? '↑' : (d < -0.05 ? '↓' : '→');
    return '<span class="' + cls + '">' + enc(deNum(t.early, 2) + ' → ' + deNum(t.late, 2) + ' ' + arrow) + '</span>';
  }

  function render(data) {
    const dash = document.getElementById('dash');
    const gate = document.getElementById('gate');
    const players = data.players || [];
    let html = '';
    html += '<p class="kicker">Silly Rangers · intern</p>';
    html += '<h1>Personenbezogene Auswertung</h1>';
    html += '<p class="admin-note">' + enc((data.n_pulls || '') + ' Pulls · ' + (data.n_evenings || '') + ' Abende · Stand ' + (data.stand || '')) +
      ' · <a href="#" id="admin-logout">Abmelden</a></p>';

    html += '<h2>Übersicht Stammspieler</h2>';
    html += '<div class="card tight"><div class="table-wrap"><table class="admin-t"><thead><tr>' +
      '<th>Spieler</th><th>Pos.</th><th class="num">Pulls</th><th class="num">Einzeltode</th><th class="num">/10</th>' +
      '<th class="num">Fehler</th><th class="num">/10</th><th class="num">unverschuldet</th>' +
      '<th>Trend Fehler</th><th>Trend Einzeltode</th></tr></thead><tbody>';
    players.forEach(function (p) {
      html += '<tr><td>' + enc(p.name) + '</td><td>' + enc(p.role) + '</td>' +
        '<td class="num">' + enc(p.pulls) + '</td>' +
        '<td class="num">' + enc(p.indiv) + '</td><td class="num">' + enc(deNum(p.indiv_rate, 2)) + '</td>' +
        '<td class="num">' + enc(p.errors) + '</td><td class="num">' + enc(deNum(p.error_rate, 2)) + '</td>' +
        '<td class="num">' + enc(p.unv) + '</td>' +
        '<td>' + trendHtml(p.trend_errors, true) + '</td>' +
        '<td>' + trendHtml(p.trend_indiv, true) + '</td></tr>';
    });
    html += '</tbody></table></div></div>';
    html += '<p class="admin-note">Trend: letzte 3 Abende mit Anwesenheit gegen alle davor. Pfeil nach oben = mehr (schlechter).</p>';

    html += '<h2>Fehlerquote über die Abende</h2>';
    html += '<div class="card"><div class="chart-box tall"><canvas id="adminChart"></canvas></div></div>';

    html += '<h2>Pro Abend und Spieler</h2>';
    html += '<div class="card tight"><div class="table-wrap"><table class="admin-t"><thead><tr><th>Abend</th>';
    players.forEach(function (p) { html += '<th class="num">' + enc(p.name) + ' (' + enc(p.role) + ')</th>'; });
    html += '</tr></thead><tbody>';
    (data.labels || []).forEach(function (lab, i) {
      html += '<tr><td>' + enc(lab) + '</td>';
      players.forEach(function (p) {
        const ev = (p.by_evening || [])[i] || {};
        if (!ev.pulls) { html += '<td class="num">–</td>'; return; }
        const bits = ev.errors + ' F / ' + ev.indiv + ' E';
        html += '<td class="num" title="' + enc('Fehler ' + ev.errors + ', Einzeltode ' + ev.indiv + ', Pulls ' + ev.pulls) + '">' +
          enc(bits) + (ev.rate != null ? '<div class="fine">' + enc(deNum(ev.rate, 1)) + '/10</div>' : '') + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table></div></div>';
    html += '<p class="admin-note">Zelle: Fehler / Einzeltode. Darunter Fehlerquote pro 10 Pulls.</p>';

    html += '<h2>Spieler × Mechanik (verschuldete Fehler)</h2>';
    const cols = data.matrix_cols || [];
    html += '<div class="card tight"><div class="table-wrap"><table class="admin-t"><thead><tr><th>Spieler</th>';
    cols.forEach(function (c) { html += '<th class="num">' + enc(c) + '</th>'; });
    html += '<th class="num">Summe</th></tr></thead><tbody>';
    (data.matrix || []).forEach(function (row) {
      let sum = 0;
      html += '<tr><td>' + enc(row.name) + ' <span class="fine">' + enc(row.role) + '</span></td>';
      cols.forEach(function (c) {
        const n = (row.cells || {})[c] || 0;
        sum += n;
        html += '<td class="num">' + (n ? enc(n) : '') + '</td>';
      });
      html += '<td class="num">' + enc(sum) + '</td></tr>';
    });
    html += '</tbody></table></div></div>';

    html += '<h2>Wipe-Verursacher pro Abend</h2>';
    (data.wipes || []).forEach(function (ev) {
      html += '<h3>' + enc(ev.label) + ' · ' + enc(ev.n_pulls) + ' Pulls</h3>';
      if (!ev.wipes || !ev.wipes.length) {
        html += '<p class="admin-note">Keine Einzelverursacher eingetragen.</p>';
        return;
      }
      html += '<div class="card tight"><div class="table-wrap"><table class="admin-t"><thead><tr>' +
        '<th>Pull</th><th>Mechanik</th><th>Spieler</th><th>Todesstoß</th><th>Hinweis</th></tr></thead><tbody>';
      ev.wipes.forEach(function (w) {
        html += '<tr><td class="num">' + enc(w.pull) + '</td><td>' + enc(w.mech) + '</td><td>' +
          enc((w.players || []).join(', ')) + '</td><td>' + enc(w.ab || '–') + '</td><td>' +
          (w.unv ? 'erster Tod unverschuldet' : '') + '</td></tr>';
      });
      html += '</tbody></table></div></div>';
    });

    if (data.notes && data.notes.length) {
      html += '<h2>Hinweise</h2><ul>' + data.notes.map(function (n) { return '<li>' + enc(n) + '</li>'; }).join('') + '</ul>';
    }
    html += '<p><a href="../index.html">Zur öffentlichen Seite</a></p>';

    dash.innerHTML = html;
    dash.classList.add('on');
    if (gate) gate.classList.add('off');

    const lo = document.getElementById('admin-logout');
    if (lo) lo.addEventListener('click', function (ev) {
      ev.preventDefault();
      try { sessionStorage.removeItem(SS_KEY); } catch (e) {}
      location.reload();
    });

    drawChart(data);
  }

  function drawChart(data) {
    const c = document.getElementById('adminChart');
    if (!c) return;
    const colors = {
      Kami: '#5b9bd5', Yashiro: '#e07a5f', Freyja: '#3dbe8c', Sam: '#e0b15c',
      Rinari: '#9b6bdb', Lunia: '#d46aa8', Ayne: '#6ec9d1', Vincent: '#c9a27a'
    };
    function go(Chart) {
      const sets = (data.players || []).map(function (p) {
        return {
          label: p.name + ' (' + p.role + ')',
          data: (p.by_evening || []).map(function (ev) { return ev.pulls ? ev.rate : null; }),
          borderColor: colors[p.name] || '#9aa3b2',
          backgroundColor: 'transparent',
          spanGaps: true,
          tension: 0.25,
          pointRadius: 3
        };
      });
      new Chart(c, {
        type: 'line',
        data: { labels: data.labels || [], datasets: sets },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: { legend: { labels: { color: '#e8eaed', boxWidth: 12 } } },
          scales: {
            y: { min: 0, title: { display: true, text: 'Fehler pro 10 Pulls' }, ticks: { color: '#9aa3b2' }, grid: { color: 'rgba(255,255,255,.06)' } },
            x: { ticks: { color: '#9aa3b2' }, grid: { display: false } }
          }
        }
      });
    }
    if (window.Chart) { go(window.Chart); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js';
    s.onload = function () { go(window.Chart); };
    document.head.appendChild(s);
  }

  function showErr(msg) {
    const el = document.getElementById('err');
    if (!el) return;
    el.hidden = false;
    el.textContent = msg;
  }

  async function boot() {
    try {
      const data = await fromSession();
      if (data) { render(data); return; }
    } catch (e) {
      try { sessionStorage.removeItem(SS_KEY); } catch (x) {}
    }
    const form = document.getElementById('admin-form');
    if (!form) return;
    form.addEventListener('submit', async function (ev) {
      ev.preventDefault();
      const u = (document.getElementById('u') || {}).value || '';
      const p = (document.getElementById('p') || {}).value || '';
      showErr('Entschlüssele …');
      try {
        const data = await unlock(u, p);
        render(data);
      } catch (err) {
        showErr('Anmeldung fehlgeschlagen. Benutzer oder Passwort ist falsch.');
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
