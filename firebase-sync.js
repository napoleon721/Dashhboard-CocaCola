/**
 * firebase-sync.js
 * Módulo de Sincronización Firebase para Coca-Cola SAP PM
 * -------------------------------------------------------
 * Permite cargar/subir datos del CSV (avisos) y configuración de
 * Presupuesto/Benchmark (Hoja2 del Excel) a Firebase Firestore.
 *
 * Uso: Incluir este script en las páginas que necesiten sincronización.
 * Requiere: firebase-config.js, plant-data-source.js cargados antes.
 */

(function () {
  'use strict';

  const SYNC_STYLES = `
  #fb-sync-overlay {
    display: none; position: fixed; inset: 0; z-index: 9999;
    background: rgba(10,10,12,0.75); backdrop-filter: blur(8px);
    align-items: center; justify-content: center;
  }
  #fb-sync-overlay.open { display: flex; }
  #fb-sync-panel {
    background: #17171A; border: 1px solid rgba(255,255,255,0.1);
    border-radius: 18px; padding: 28px 32px; width: 100%; max-width: 540px;
    box-shadow: 0 24px 80px rgba(0,0,0,0.6); font-family: 'Poppins', sans-serif;
    color: #F2F1EE; animation: syncSlideIn 0.3s ease;
  }
  @keyframes syncSlideIn {
    from { opacity: 0; transform: translateY(-24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  #fb-sync-panel h3 {
    font-size: 17px; font-weight: 700; margin: 0 0 4px;
    background: linear-gradient(135deg, #C9A24A, #E4002B);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  #fb-sync-panel p.subtitle { font-size: 12px; color: #8B8990; margin: 0 0 22px; }
  .sync-section {
    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
    border-radius: 12px; padding: 16px 18px; margin-bottom: 14px;
  }
  .sync-section-title {
    font-size: 12px; font-weight: 700; color: #C9A24A;
    text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;
  }
  .sync-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
  .sync-label { font-size: 12.5px; color: #C8C7C4; flex: 1; }
  .sync-value { font-size: 12px; font-weight: 600; color: #00D2FF; font-family: 'JetBrains Mono', monospace; }
  .sync-status-tag { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; }
  .tag-ok   { background: rgba(61,157,107,0.2); color: #3D9D6B; }
  .tag-err  { background: rgba(228,0,43,0.15); color: #E4002B; }
  .tag-wait { background: rgba(201,162,74,0.15); color: #C9A24A; }
  .sync-progress { height: 4px; background: rgba(255,255,255,0.07); border-radius: 99px; margin: 12px 0 6px; overflow: hidden; }
  .sync-progress-bar { height: 100%; width: 0%; border-radius: 99px; background: linear-gradient(90deg, #C9A24A, #E4002B); transition: width 0.4s ease; }
  .sync-log { font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #8B8990; max-height: 100px; overflow-y: auto; background: rgba(0,0,0,0.3); border-radius: 8px; padding: 8px 10px; margin-top: 8px; }
  .sync-log span { display: block; margin-bottom: 2px; }
  .sync-log .log-ok   { color: #3D9D6B; }
  .sync-log .log-err  { color: #E4002B; }
  .sync-log .log-info { color: #C9A24A; }
  .sync-actions { display: flex; gap: 10px; margin-top: 20px; }
  .btn-sync-primary {
    flex: 1; padding: 11px 16px; border-radius: 10px; border: none; cursor: pointer;
    background: linear-gradient(135deg, #C9A24A, #E4002B); color: #fff;
    font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 700;
    transition: opacity 0.2s, transform 0.15s;
  }
  .btn-sync-primary:hover:not(:disabled) { opacity: 0.88; transform: scale(1.02); }
  .btn-sync-primary:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-sync-secondary {
    padding: 11px 20px; border-radius: 10px; cursor: pointer;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
    color: #8B8990; font-family: 'Poppins', sans-serif; font-size: 13px;
    transition: background 0.2s, color 0.2s;
  }
  .btn-sync-secondary:hover { background: rgba(255,255,255,0.09); color: #F2F1EE; }
  `;

  function injectStyles() {
    if (document.getElementById('fb-sync-styles')) return;
    const el = document.createElement('style');
    el.id = 'fb-sync-styles';
    el.textContent = SYNC_STYLES;
    document.head.appendChild(el);
  }

  function buildPanel() {
    if (document.getElementById('fb-sync-overlay')) return;

    const totalRows = (() => {
      try { return (window.DEFAULT_EMBEDDED_CSV || '').split('\r\n').length - 1; } catch(e) { return 0; }
    })();

    const budgets    = window.MONTHLY_BUDGETS_2026 || {};
    const benchmarks = window.MONTHLY_BENCHMARKS_2026 || {};
    const totalBudget    = Object.values(budgets).reduce((a,b)=>a+(b||0),0);
    const totalBenchmark = Object.values(benchmarks).reduce((a,b)=>a+(b||0),0);

    const overlay = document.createElement('div');
    overlay.id = 'fb-sync-overlay';
    overlay.innerHTML = `
      <div id="fb-sync-panel">
        <h3>Sincronizacion Firebase</h3>
        <p class="subtitle">Sube los datos del Excel a Firestore para sincronizar todas las paginas en tiempo real.</p>
        <div class="sync-section">
          <div class="sync-section-title">Dataset de Avisos (Hoja1)</div>
          <div class="sync-row"><span class="sync-label">Total de registros</span><span class="sync-value">${totalRows.toLocaleString()} avisos</span></div>
          <div class="sync-row"><span class="sync-label">Coleccion Firestore</span><span class="sync-value">plant_data / csv_data</span></div>
          <div class="sync-row"><span class="sync-label">Estado</span><span class="sync-status-tag tag-wait" id="sync-csv-status">Pendiente</span></div>
        </div>
        <div class="sync-section">
          <div class="sync-section-title">Presupuesto y Benchmark Mensual (Hoja2)</div>
          <div class="sync-row"><span class="sync-label">Budget total anual 2026</span><span class="sync-value">$${totalBudget.toLocaleString('en-US',{minimumFractionDigits:2})} USD</span></div>
          <div class="sync-row"><span class="sync-label">Benchmark total anual</span><span class="sync-value">$${totalBenchmark.toLocaleString('en-US',{minimumFractionDigits:2})} USD</span></div>
          <div class="sync-row"><span class="sync-label">Coleccion Firestore</span><span class="sync-value">plant_data / budget_config</span></div>
          <div class="sync-row"><span class="sync-label">Estado</span><span class="sync-status-tag tag-wait" id="sync-budget-status">Pendiente</span></div>
        </div>
        <div class="sync-progress"><div class="sync-progress-bar" id="sync-progress-bar"></div></div>
        <div class="sync-log" id="sync-log"><span class="log-info">Listo para sincronizar. Haz clic en Subir a Firebase.</span></div>
        <div class="sync-actions">
          <button class="btn-sync-primary" id="btn-do-sync">Subir a Firebase</button>
          <button class="btn-sync-secondary" id="btn-sync-close">Cerrar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#btn-sync-close').addEventListener('click', () => overlay.classList.remove('open'));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); });
    overlay.querySelector('#btn-do-sync').addEventListener('click', runSync);
  }

  function logMsg(msg, type) {
    const log = document.getElementById('sync-log');
    if (!log) return;
    const span = document.createElement('span');
    span.className = 'log-' + (type || 'info');
    const now = new Date().toLocaleTimeString('es-GT');
    span.textContent = '[' + now + '] ' + msg;
    log.appendChild(span);
    log.scrollTop = log.scrollHeight;
  }

  function setProgress(pct) {
    const bar = document.getElementById('sync-progress-bar');
    if (bar) bar.style.width = Math.min(100, pct) + '%';
  }

  async function runSync() {
    const btn = document.getElementById('btn-do-sync');
    if (btn) btn.disabled = true;
    const log = document.getElementById('sync-log');
    if (log) log.innerHTML = '';
    setProgress(5);

    if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
      logMsg('Firebase no esta inicializado.', 'err');
      if (btn) btn.disabled = false;
      return;
    }

    const db = firebase.firestore();
    const csvStatus    = document.getElementById('sync-csv-status');
    const budgetStatus = document.getElementById('sync-budget-status');

    // 1. Subir CSV
    logMsg('Iniciando subida de dataset CSV...', 'info');
    try {
      const csvText = window.DEFAULT_EMBEDDED_CSV;
      if (!csvText || csvText.trim().length < 100) throw new Error('CSV vacio o no cargado.');
      const rows = csvText.split('\r\n').slice(1).filter(function(r){ return r.trim().length > 0; });
      logMsg(rows.length + ' registros detectados. Guardando...', 'info');
      setProgress(20);
      // 1A. Guardar en plant_data / active_csv (puntero en tiempo real para todos los dashboards)
      const batchId = 'batch_' + Date.now();
      const nowTs = Date.now();
      await db.collection('plant_data').doc('active_csv').set({
        activeBatchId: batchId,
        csvText: csvText,
        fileName: 'DB AVISOS MA,SEG,CA,ZA 1.xlsx (Oficial 286 Avisos)',
        rowsCount: rows.length,
        updatedAt: nowTs
      });

      // 1B. Guardar en upload_history
      await db.collection('upload_history').doc(batchId).set({
        id: batchId,
        fileName: 'DB AVISOS MA,SEG,CA,ZA 1.xlsx (Oficial 286 Avisos)',
        timestamp: nowTs,
        rowsCount: rows.length,
        csvText: csvText,
        isActive: true
      });

      // 1C. Guardar en plant_data / csv_data
      await db.collection('plant_data').doc('csv_data').set({
        csvText: csvText,
        rowCount: rows.length,
        header: csvText.split('\r\n')[0],
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: 'firebase-sync.js',
        source: 'Excel Hoja1 - SAP PM Avisos (286 registros)'
      });

      try {
        localStorage.setItem('cocacola_active_csv', csvText);
      } catch(e){}

      logMsg('CSV subido y activado correctamente (' + rows.length + ' registros en active_csv y upload_history).', 'ok');
      setProgress(55);
      if (csvStatus) { csvStatus.textContent = 'Sincronizado'; csvStatus.className = 'sync-status-tag tag-ok'; }
    } catch(err) {
      logMsg('Error al subir CSV: ' + err.message, 'err');
      if (csvStatus) { csvStatus.textContent = 'Error'; csvStatus.className = 'sync-status-tag tag-err'; }
    }

    // 2. Subir Budget + Benchmark
    logMsg('Subiendo presupuesto y benchmark 2026...', 'info');
    setProgress(65);
    try {
      const budgets    = window.MONTHLY_BUDGETS_2026 || {};
      const benchmarks = window.MONTHLY_BENCHMARKS_2026 || {};
      if (Object.keys(budgets).length === 0) throw new Error('MONTHLY_BUDGETS_2026 no disponible.');
      await db.collection('plant_data').doc('budget_config').set({
        budgets: budgets,
        benchmarks: benchmarks,
        year: 2026,
        totalBudget: Object.values(budgets).reduce(function(a,b){ return a+(b||0); }, 0),
        totalBenchmark: Object.values(benchmarks).reduce(function(a,b){ return a+(b||0); }, 0),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: 'firebase-sync.js',
        source: 'Excel Hoja2 - Presupuesto y Benchmark'
      });

      try {
        localStorage.setItem('cocacola_monthly_budgets', JSON.stringify(budgets));
        localStorage.setItem('cocacola_monthly_benchmarks', JSON.stringify(benchmarks));
      } catch(e){}

      logMsg('Presupuesto y benchmark sincronizados con Firestore.', 'ok');
      setProgress(90);
      if (budgetStatus) { budgetStatus.textContent = 'Sincronizado'; budgetStatus.className = 'sync-status-tag tag-ok'; }
    } catch(err) {
      logMsg('Error al subir presupuesto: ' + err.message, 'err');
      if (budgetStatus) { budgetStatus.textContent = 'Error'; budgetStatus.className = 'sync-status-tag tag-err'; }
    }

    setProgress(100);
    logMsg('¡Sincronización completada exitosamente! Todas las vistas se actualizarán automáticamente.', 'ok');
    if (btn) { btn.disabled = false; btn.textContent = 'Volver a Sincronizar'; }
  }

  // API publica
  window.FirebaseSync = {
    open: function() {
      injectStyles();
      buildPanel();
      var overlay = document.getElementById('fb-sync-overlay');
      if (overlay) overlay.classList.add('open');
    },
    syncSilent: async function() {
      if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) return;
      var db = firebase.firestore();
      try {
        var csvText = window.DEFAULT_EMBEDDED_CSV;
        if (csvText && csvText.length > 100) {
          var rows = csvText.split('\r\n').slice(1).filter(function(r){ return r.trim().length > 0; });
          var batchId = 'batch_' + Date.now();
          var nowTs = Date.now();
          await db.collection('plant_data').doc('active_csv').set({
            activeBatchId: batchId,
            csvText: csvText,
            fileName: 'DB AVISOS MA,SEG,CA,ZA 1.xlsx (Oficial 286 Avisos)',
            rowsCount: rows.length,
            updatedAt: nowTs
          });
          await db.collection('plant_data').doc('csv_data').set({
            csvText: csvText, rowCount: rows.length,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            source: 'plant-data-source.js auto-sync'
          });
          try { localStorage.setItem('cocacola_active_csv', csvText); } catch(e){}
        }
        var budgets    = window.MONTHLY_BUDGETS_2026 || {};
        var benchmarks = window.MONTHLY_BENCHMARKS_2026 || {};
        if (Object.keys(budgets).length > 0) {
          await db.collection('plant_data').doc('budget_config').set({
            budgets: budgets, benchmarks: benchmarks, year: 2026,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            source: 'plant-data-source.js auto-sync'
          });
          try {
            localStorage.setItem('cocacola_monthly_budgets', JSON.stringify(budgets));
            localStorage.setItem('cocacola_monthly_benchmarks', JSON.stringify(benchmarks));
          } catch(e){}
        }
        console.log('[FirebaseSync] Sincronizacion silenciosa completada.');
      } catch(e) {
        console.warn('[FirebaseSync] Error en sync silencioso:', e.message);
      }
    }
  };

  document.addEventListener('DOMContentLoaded', function() {
    injectStyles();
    buildPanel();
    document.querySelectorAll('[data-action="firebase-sync"], #btnFirebaseSync, #btn-firebase-sync').forEach(function(el) {
      el.addEventListener('click', function() { window.FirebaseSync.open(); });
    });
  });

})();
