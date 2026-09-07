/**
 * SISTEMA INDUSTRIAL DE CONFIGURACIÓN & PARÁMETROS SAP PM
 * Coca-Cola Planta Industrial
 * Módulo Global Unificado
 */

(function() {
  const SETTINGS_KEY = 'cocacola_system_settings';

  const DEFAULT_SETTINGS = {
    // 1. Metas & KPIs
    targetMTBF: 480, // horas mínimas esperadas
    targetSLA: 90,   // % cumplimiento
    critDays: 5,     // días para alerta crítica
    targetOEE: 85,   // % disponibilidad esperada

    // 2. Presupuestos Mensuales (USD)
    budgets: {
      "2026-01": 7000, "2026-02": 6500, "2026-03": 8000, "2026-04": 7500,
      "2026-05": 6000, "2026-06": 7000, "2026-07": 8500, "2026-08": 5500,
      "2026-09": 7000, "2026-10": 7500, "2026-11": 6500, "2026-12": 8000
    },
    currency: 'USD',
    budgetAlertThreshold: 85, // %

    // 3. Seguridad & Roles
    masterPass: 'master123',
    inactivityMinutes: 10,
    customOperators: [],

    // 4. Preferencias y Alertas
    soundAlerts: true,
    autoCloudSync: true
  };

  // Helper para obtener configuración
  window.getSystemSettings = function() {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(saved));
      }
    } catch(e) {}
    return Object.assign({}, DEFAULT_SETTINGS);
  };

  // Helper para guardar configuración
  window.saveSystemSettings = function(newSettings) {
    try {
      const current = window.getSystemSettings();
      const merged = Object.assign({}, current, newSettings);
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
      
      // Sincronizar también en Firebase si está disponible
      if (typeof _fbDb !== 'undefined') {
        try {
          _fbDb.collection('plant_data').doc('system_settings').set(merged, { merge: true }).catch(()=>{});
        } catch(e){}
      }

      window.dispatchEvent(new CustomEvent('cocacola:settings_updated', { detail: merged }));
      return true;
    } catch(e) {
      console.error('Error al guardar configuración:', e);
      return false;
    }
  };

  // Función para inyectar CSS del modal de configuración
  function injectSettingsStyles() {
    if (document.getElementById('system-settings-css')) return;
    const style = document.createElement('style');
    style.id = 'system-settings-css';
    style.textContent = `
      .settings-modal-backdrop {
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.82); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
        z-index: 10000; display: none; align-items: center; justify-content: center; padding: 16px;
      }
      .settings-modal-backdrop.active { display: flex; animation: setFadeIn .22s cubic-bezier(0.16, 1, 0.3, 1) both; }
      @keyframes setFadeIn { from { opacity: 0; transform: scale(.98); } to { opacity: 1; transform: scale(1); } }

      .settings-card {
        background: var(--panel, #17171A); border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 18px; width: 680px; max-width: 100%; max-height: 90vh;
        display: flex; flex-direction: column; box-shadow: 0 28px 70px rgba(0,0,0,0.85); overflow: hidden;
      }
      .settings-header {
        padding: 18px 24px; border-bottom: 1px solid var(--line, rgba(255,255,255,0.08));
        display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.02);
      }
      .settings-header h3 {
        font-size: 15px; font-weight: 700; color: var(--text, #F2F1EE); display: flex; align-items: center; gap: 10px;
      }
      .settings-close-btn {
        background: none; border: none; color: var(--text-dim, #8B8990); font-size: 24px; cursor: pointer;
        line-height: 1; transition: color .15s;
      }
      .settings-close-btn:hover { color: #FFF; }

      /* Tabs */
      .settings-tabs-bar {
        display: flex; gap: 4px; padding: 10px 20px; background: var(--panel-2, #1C1C1F);
        border-bottom: 1px solid var(--line, rgba(255,255,255,0.08)); overflow-x: auto; -webkit-overflow-scrolling: touch;
      }
      .settings-tab-item {
        background: none; border: 1px solid transparent; color: var(--text-dim, #8B8990);
        padding: 8px 14px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer;
        display: inline-flex; align-items: center; gap: 7px; transition: all .18s ease; font-family: inherit; white-space: nowrap;
      }
      .settings-tab-item:hover { color: var(--text, #F2F1EE); background: rgba(255,255,255,0.04); }
      .settings-tab-item.active {
        background: var(--red-dim, rgba(228,0,43,0.14)); color: #FFF; border-color: rgba(228,0,43,0.4);
      }

      /* Body */
      .settings-body {
        padding: 22px 24px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 18px;
      }
      .settings-pane { display: none; flex-direction: column; gap: 16px; }
      .settings-pane.active { display: flex; animation: setPaneIn .2s ease; }
      @keyframes setPaneIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

      .settings-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      @media(max-width: 600px){ .settings-grid-2 { grid-template-columns: 1fr; } }

      .settings-field {
        background: var(--panel-2, #1C1C1F); border: 1px solid var(--line, rgba(255,255,255,0.08));
        padding: 12px 14px; border-radius: 10px; display: flex; flex-direction: column; gap: 6px;
      }
      .settings-label {
        font-size: 11px; font-weight: 600; color: var(--text-dim, #8B8990); text-transform: uppercase;
        font-family: var(--mono, monospace); letter-spacing: 0.5px;
      }
      .settings-desc { font-size: 11px; color: var(--text-faint, #57555C); line-height: 1.35; }
      .settings-input {
        background: var(--bg, #0E0E10); border: 1px solid var(--line, rgba(255,255,255,0.12));
        color: var(--text, #F2F1EE); padding: 8px 12px; border-radius: 7px; font-size: 13px; font-family: inherit; outline: none;
      }
      .settings-input:focus { border-color: var(--gold, #C9A24A); }

      /* Footer */
      .settings-footer {
        padding: 14px 24px; border-top: 1px solid var(--line, rgba(255,255,255,0.08));
        display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.02);
      }
      .settings-btn-save {
        background: var(--red, #E4002B); border: 1px solid var(--red, #E4002B); color: #FFF;
        padding: 9px 18px; border-radius: 8px; font-size: 12.5px; font-weight: 700; cursor: pointer;
        display: inline-flex; align-items: center; gap: 6px; transition: all .18s ease; box-shadow: 0 4px 14px rgba(228,0,43,0.3);
      }
      .settings-btn-save:hover { background: #ff1e43; }
      .settings-btn-save:active { transform: scale(.97); }

      .settings-btn-reset {
        background: var(--panel-2, #1C1C1F); border: 1px solid var(--line, rgba(255,255,255,0.1));
        color: var(--text-dim, #8B8990); padding: 9px 14px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer;
      }
      .settings-btn-reset:hover { color: #FFF; background: rgba(255,255,255,0.06); }

      .settings-badge {
        font-size: 10px; font-family: var(--mono, monospace); padding: 2px 7px; border-radius: 4px;
        background: rgba(201,162,74,0.15); color: var(--gold, #C9A24A); border: 1px solid rgba(201,162,74,0.25);
      }

      @media (max-width: 500px) {
        .settings-card { border-radius: 14px; max-height: 95vh; }
        .settings-header { padding: 14px 16px; }
        .settings-body { padding: 14px 16px; }
        .settings-footer { padding: 12px 16px; flex-direction: column-reverse; gap: 8px; }
        .settings-footer button { width: 100%; justify-content: center; }
        .settings-tabs-bar { padding: 8px 12px; }
      }
    `;
    document.head.appendChild(style);
  }

  // Función para inyectar el HTML del modal en el DOM
  function injectSettingsModal() {
    if (document.getElementById('globalSystemSettingsModal')) return;

    const modal = document.createElement('div');
    modal.id = 'globalSystemSettingsModal';
    modal.className = 'settings-modal-backdrop';
    modal.innerHTML = `
      <div class="settings-card">
        <div class="settings-header">
          <h3>
            <svg class="icon" viewBox="0 0 24 24" style="color:var(--gold,#C9A24A); width:20px; height:20px; stroke-width:2; stroke:currentColor; fill:none;"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Configuración & Parámetros del Sistema
          </h3>
          <button class="settings-close-btn" id="closeSettingsModalBtn">&times;</button>
        </div>

        <div class="settings-tabs-bar">
          <button class="settings-tab-item active" data-tab="tab-kpis">🎯 Metas & KPIs</button>
          <button class="settings-tab-item" data-tab="tab-budget">💵 Presupuesto (USD)</button>
          <button class="settings-tab-item" data-tab="tab-security">🛡️ Seguridad & Roles</button>
          <button class="settings-tab-item" data-tab="tab-data">💾 Datos & Respaldo</button>
        </div>

        <div class="settings-body">
          <!-- TAB 1: METAS & KPIS -->
          <div class="settings-pane active" id="tab-kpis">
            <div style="font-size:12px; color:var(--text-dim,#8B8990); line-height:1.4;">
              Defina los objetivos operacionales y umbrales de alerta que rigen el cálculo de confiabilidad y estado de equipos en planta.
            </div>

            <div class="settings-grid-2">
              <div class="settings-field">
                <label class="settings-label" for="cfgTargetMTBF">Meta MTBF (Horas):</label>
                <div class="settings-desc">Horas mínimas promedio esperadas entre paradas de avería no programada (Clase ZA).</div>
                <input type="number" id="cfgTargetMTBF" class="settings-input" min="50" max="2000" step="10" />
              </div>

              <div class="settings-field">
                <label class="settings-label" for="cfgTargetSLA">Meta SLA de Cierre (%):</label>
                <div class="settings-desc">Porcentaje objetivo de avisos resueltos y cerrados (MECE) sobre el total.</div>
                <input type="number" id="cfgTargetSLA" class="settings-input" min="50" max="100" step="1" />
              </div>

              <div class="settings-field">
                <label class="settings-label" for="cfgCritDays">Días para Alerta Crítica:</label>
                <div class="settings-desc">Tiempo máximo que un aviso puede permanecer abierto sin resolución antes de marcarse rojo.</div>
                <input type="number" id="cfgCritDays" class="settings-input" min="1" max="60" step="1" />
              </div>

              <div class="settings-field">
                <label class="settings-label" for="cfgTargetOEE">Meta OEE de Disponibilidad (%):</label>
                <div class="settings-desc">Disponibilidad operacional proyectada para las líneas de envasado.</div>
                <input type="number" id="cfgTargetOEE" class="settings-input" min="50" max="100" step="1" />
              </div>
            </div>
          </div>

          <!-- TAB 2: BUDGET / PRESUPUESTO -->
          <div class="settings-pane" id="tab-budget">
            <div style="font-size:12px; color:var(--text-dim,#8B8990); line-height:1.4;">
              Presupuestos mensuales asignados para comparar contra el gasto real de órdenes de trabajo (OTs) y proyectar la tendencia financiera.
            </div>

            <div class="settings-grid-2">
              <div class="settings-field">
                <label class="settings-label" for="cfgCurrency">Moneda Operativa:</label>
                <select id="cfgCurrency" class="settings-input">
                  <option value="USD">Dólares Estadounidenses ($ USD)</option>
                  <option value="EUR">Euros (€ EUR)</option>
                  <option value="MXN">Pesos Mexicanos ($ MXN)</option>
                </select>
              </div>

              <div class="settings-field">
                <label class="settings-label" for="cfgBudgetThreshold">Umbral Alerta Sobrecoste (%):</label>
                <input type="number" id="cfgBudgetThreshold" class="settings-input" min="50" max="100" step="5" />
              </div>
            </div>

            <div style="margin-top:6px;">
              <div class="settings-label" style="margin-bottom:8px;">Distribución Mensual de Presupuesto:</div>
              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:8px;" id="cfgBudgetInputsContainer">
                <!-- Dinámico -->
              </div>
            </div>
          </div>

          <!-- TAB 3: SEGURIDAD & ROLES -->
          <div class="settings-pane" id="tab-security">
            <div style="font-size:12px; color:var(--text-dim,#8B8990); line-height:1.4;">
              Ajustes de autenticación, control de accesos de operadores y temporizador de seguridad de sesión.
            </div>

            <div class="settings-grid-2">
              <div class="settings-field">
                <label class="settings-label" for="cfgMasterPass">Nueva Contraseña Master:</label>
                <div class="settings-desc">Clave requerida para el usuario sv001437 y funciones de administración.</div>
                <input type="password" id="cfgMasterPass" class="settings-input" placeholder="Mínimo 6 caracteres" />
              </div>

              <div class="settings-field">
                <label class="settings-label" for="cfgInactivity">Cierre de Sesión por Inactividad:</label>
                <select id="cfgInactivity" class="settings-input">
                  <option value="5">5 Minutos</option>
                  <option value="10">10 Minutos (Recomendado)</option>
                  <option value="15">15 Minutos</option>
                  <option value="30">30 Minutos</option>
                  <option value="0">Desactivado (Permanente)</option>
                </select>
              </div>
            </div>

            <div class="settings-field" style="margin-top:6px;">
              <label class="settings-label" for="cfgNewOpId">Registrar Nuevo ID de Autor / Operador:</label>
              <div class="settings-desc">Agregue un identificador numérico o alfanumérico para nuevos técnicos de planta.</div>
              <div style="display:flex; gap:8px; margin-top:4px;">
                <input type="text" id="cfgNewOpId" class="settings-input" placeholder="Ej: 76019999 o 14200PAE" style="flex:1;" />
                <button type="button" class="settings-btn-reset" id="btnAddOpId" style="font-weight:700;">+ Agregar</button>
              </div>
              <div id="cfgOpListTags" style="display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;"></div>
            </div>
          </div>

          <!-- TAB 4: DATOS & RESPALDO -->
          <div class="settings-pane" id="tab-data">
            <div style="font-size:12px; color:var(--text-dim,#8B8990); line-height:1.4;">
              Herramientas de exportación masiva, respaldo de seguridad y restablecimiento de integridad del sistema.
            </div>

            <div class="settings-grid-2">
              <div class="settings-field">
                <label class="settings-label">Respaldo Integral JSON:</label>
                <div class="settings-desc">Descarga una copia completa de todos los avisos, costos y configuraciones activas.</div>
                <button type="button" class="settings-btn-reset" id="btnExportFullJSON" style="margin-top:6px; color:var(--gold,#C9A24A); border-color:rgba(201,162,74,0.35);">
                  📦 Descargar Backup JSON
                </button>
              </div>

              <div class="settings-field">
                <label class="settings-label">Exportar Archivo CSV de Planta:</label>
                <div class="settings-desc">Genera el archivo estándar delimitado por punto y coma (;) compatible con SAP PM.</div>
                <button type="button" class="settings-btn-reset" id="btnExportPlantCSV" style="margin-top:6px;">
                  📄 Descargar DBMANTTO.csv
                </button>
              </div>
            </div>

            <div class="settings-field" style="border-color:rgba(228,0,43,0.3); background:rgba(228,0,43,0.04);">
              <label class="settings-label" style="color:var(--red,#E4002B);">Restablecer Base de Datos de Fábrica:</label>
              <div class="settings-desc">Restaura inmediatamente los 269 avisos oficiales embebidos y limpia datos temporales.</div>
              <button type="button" class="settings-btn-reset" id="btnRestoreFactoryData" style="margin-top:8px; background:rgba(228,0,43,0.15); border-color:var(--red,#E4002B); color:#FFF; font-weight:700;">
                ⚠️ Restaurar Dataset Oficial de Fábrica
              </button>
            </div>
          </div>
        </div>

        <div class="settings-footer">
          <button class="settings-btn-reset" id="btnRestoreDefaultSettings">Restablecer Valores Iniciales</button>
          <button class="settings-btn-save" id="btnSaveSystemSettings">
            <svg class="icon" viewBox="0 0 24 24" style="width:14px; height:14px; stroke:currentColor; fill:none; stroke-width:2.5;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Guardar Configuración
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    setupSettingsModalEvents(modal);
  }

  // Configuración de eventos del modal
  function setupSettingsModalEvents(modal) {
    const closeBtn = modal.querySelector('#closeSettingsModalBtn');
    const tabs = modal.querySelectorAll('.settings-tab-item');
    const panes = modal.querySelectorAll('.settings-pane');
    const btnSave = modal.querySelector('#btnSaveSystemSettings');
    const btnReset = modal.querySelector('#btnRestoreDefaultSettings');

    // Cambiar Tabs
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        panes.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.getAttribute('data-tab');
        const targetPane = modal.querySelector('#' + target);
        if (targetPane) targetPane.classList.add('active');
      });
    });

    // Cerrar Modal
    const closeModal = () => modal.classList.remove('active');
    if (closeBtn) closeBtn.onclick = closeModal;
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Rellenar valores
    window.openSystemSettingsModal = function() {
      populateSettingsForm(modal);
      modal.classList.add('active');
    };

    // Guardar
    if (btnSave) {
      btnSave.addEventListener('click', () => {
        const current = window.getSystemSettings();
        
        // Tab 1: Metas
        const targetMTBF = parseInt(modal.querySelector('#cfgTargetMTBF').value, 10) || 480;
        const targetSLA = parseInt(modal.querySelector('#cfgTargetSLA').value, 10) || 90;
        const critDays = parseInt(modal.querySelector('#cfgCritDays').value, 10) || 5;
        const targetOEE = parseInt(modal.querySelector('#cfgTargetOEE').value, 10) || 85;

        // Tab 2: Budget
        const currency = modal.querySelector('#cfgCurrency').value || 'USD';
        const budgetAlertThreshold = parseInt(modal.querySelector('#cfgBudgetThreshold').value, 10) || 85;
        const newBudgets = Object.assign({}, current.budgets);
        modal.querySelectorAll('.cfg-month-budget').forEach(inp => {
          const k = inp.getAttribute('data-key');
          if (k) newBudgets[k] = parseFloat(inp.value) || 0;
        });

        // Tab 3: Seguridad
        const newPass = modal.querySelector('#cfgMasterPass').value.trim();
        const masterPass = (newPass && newPass.length >= 4) ? newPass : current.masterPass;
        const inactivityMinutes = parseInt(modal.querySelector('#cfgInactivity').value, 10);

        const updated = {
          targetMTBF,
          targetSLA,
          critDays,
          targetOEE,
          currency,
          budgetAlertThreshold,
          budgets: newBudgets,
          masterPass,
          inactivityMinutes,
          customOperators: current.customOperators || []
        };

        window.saveSystemSettings(updated);
        closeModal();
        alert('✅ Configuración industrial actualizada y guardada con éxito.');
      });
    }

    // Reset Defaults
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        if (confirm('¿Desea restablecer todos los parámetros industriales a sus valores originales de fábrica?')) {
          window.saveSystemSettings(DEFAULT_SETTINGS);
          populateSettingsForm(modal);
          alert('Valores restablecidos a valores por defecto.');
        }
      });
    }

    // Backups
    const btnFullJSON = modal.querySelector('#btnExportFullJSON');
    if (btnFullJSON) {
      btnFullJSON.addEventListener('click', () => {
        const data = {
          exportTimestamp: new Date().toISOString(),
          settings: window.getSystemSettings(),
          totalNotices: (window.currentRows || window.currentStatsRows || []).length,
          rows: window.currentRows || window.currentStatsRows || []
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `CocaCola_Backup_Completo_${Date.now()}.json`;
        a.click();
      });
    }

    const btnPlantCSV = modal.querySelector('#btnExportPlantCSV');
    if (btnPlantCSV) {
      btnPlantCSV.addEventListener('click', () => {
        const rows = window.currentRows || window.currentStatsRows || [];
        if (rows.length === 0) return alert('No hay datos activos para exportar');
        const csvContent = rows.map(r => r.join(';')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `DBMANTTO_${Date.now()}.csv`;
        a.click();
      });
    }

    // Restaurar Fábrica
    const btnRestore = modal.querySelector('#btnRestoreFactoryData');
    if (btnRestore) {
      btnRestore.addEventListener('click', () => {
        if (confirm('⚠️ ¿Está seguro de restaurar el dataset oficial de 269 registros de fábrica? Esto sobreescribirá cambios no guardados.')) {
          if (typeof window.DEFAULT_EMBEDDED_CSV === 'string') {
            localStorage.setItem('cocacola_active_csv', window.DEFAULT_EMBEDDED_CSV);
            if (typeof _fbDb !== 'undefined') {
              _fbDb.collection('plant_data').doc('active_csv').set({
                csvText: window.DEFAULT_EMBEDDED_CSV,
                updatedAt: Date.now(),
                fileName: 'DBMANTTO.csv'
              }).catch(()=>{});
            }
            alert('✅ Base de datos restaurada al dataset oficial de fábrica. La página se recargará.');
            window.location.reload();
          }
        }
      });
    }

    // Agregar Operador
    const btnAddOp = modal.querySelector('#btnAddOpId');
    const inputNewOp = modal.querySelector('#cfgNewOpId');
    if (btnAddOp && inputNewOp) {
      btnAddOp.addEventListener('click', () => {
        const val = inputNewOp.value.trim().toUpperCase();
        if (!val) return;
        const current = window.getSystemSettings();
        current.customOperators = current.customOperators || [];
        if (!current.customOperators.includes(val)) {
          current.customOperators.push(val);
          window.saveSystemSettings(current);
          inputNewOp.value = '';
          renderOpTags(modal, current.customOperators);
        }
      });
    }
  }

  function renderOpTags(modal, list) {
    const container = modal.querySelector('#cfgOpListTags');
    if (!container) return;
    container.innerHTML = (list || []).map(op => `
      <span class="settings-badge" style="display:inline-flex; align-items:center; gap:4px;">
        ${op}
        <button type="button" style="background:none; border:none; color:var(--red,#E4002B); cursor:pointer; font-size:12px;" onclick="removeCustomOp('${op}')">&times;</button>
      </span>
    `).join('');
  }

  window.removeCustomOp = function(opId) {
    const current = window.getSystemSettings();
    current.customOperators = (current.customOperators || []).filter(o => o !== opId);
    window.saveSystemSettings(current);
    const modal = document.getElementById('globalSystemSettingsModal');
    if (modal) renderOpTags(modal, current.customOperators);
  };

  function populateSettingsForm(modal) {
    const cfg = window.getSystemSettings();

    // Tab 1
    modal.querySelector('#cfgTargetMTBF').value = cfg.targetMTBF;
    modal.querySelector('#cfgTargetSLA').value = cfg.targetSLA;
    modal.querySelector('#cfgCritDays').value = cfg.critDays;
    modal.querySelector('#cfgTargetOEE').value = cfg.targetOEE;

    // Tab 2
    modal.querySelector('#cfgCurrency').value = cfg.currency || 'USD';
    modal.querySelector('#cfgBudgetThreshold').value = cfg.budgetAlertThreshold || 85;

    const budgetContainer = modal.querySelector('#cfgBudgetInputsContainer');
    if (budgetContainer) {
      const monthNames = {
        '2026-01': 'Enero', '2026-02': 'Febrero', '2026-03': 'Marzo', '2026-04': 'Abril',
        '2026-05': 'Mayo', '2026-06': 'Junio', '2026-07': 'Julio', '2026-08': 'Agosto',
        '2026-09': 'Septiembre', '2026-10': 'Octubre', '2026-11': 'Noviembre', '2026-12': 'Diciembre'
      };
      budgetContainer.innerHTML = Object.keys(monthNames).map(k => `
        <div style="display:flex; flex-direction:column; gap:3px;">
          <span style="font-size:10px; color:var(--text-dim,#8B8990); font-family:var(--mono,monospace);">${monthNames[k]}</span>
          <input type="number" class="settings-input cfg-month-budget" data-key="${k}" value="${(cfg.budgets && cfg.budgets[k]) || 7000}" step="500" />
        </div>
      `).join('');
    }

    // Tab 3
    modal.querySelector('#cfgMasterPass').value = cfg.masterPass || 'master123';
    modal.querySelector('#cfgInactivity').value = String(cfg.inactivityMinutes);
    renderOpTags(modal, cfg.customOperators);
  }

  // Inicialización automática
  function initSettingsModule() {
    injectSettingsStyles();
    injectSettingsModal();

    // Conectar botones con id "globalSettingsBtn", "#sideSettingsBtn" o clase "btn-open-settings"
    document.querySelectorAll('#globalSettingsBtn, #sideSettingsBtn, .btn-open-settings').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.openSystemSettingsModal();
      });
    });

    // Delegación global por si se añaden botones dinámicamente
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('#globalSettingsBtn, #sideSettingsBtn, .btn-open-settings');
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        window.openSystemSettingsModal();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSettingsModule);
  } else {
    initSettingsModule();
  }
})();
