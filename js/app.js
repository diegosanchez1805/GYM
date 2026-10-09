/**
 * app.js - Lógica principal de la aplicación TITAN GYM
 * Control de acceso, interfaz de quiosco, filtros de miembros y modales
 */

const App = (() => {
  // Estado actual de la aplicación
  let currentFilter = 'all'; // 'all' | 'warning' | 'active' | 'expired'
  let searchQuery = '';
  let currentSort = 'expiring-asc';

  // ==================== INICIALIZACIÓN ====================
  const init = () => {
    bindNavigation();
    bindCheckinEvents();
    bindMembersEvents();
    bindModalEvents();
    bindSoundToggle();
    bindBackupEvents();

    // Carga inicial
    refreshStats();
    renderMembersTable();
    renderLogsList();

    // Prellenar fecha de hoy en el formulario de nuevo socio
    const todayStr = DataManager.formatDateISO(new Date());
    const inputStartDate = document.getElementById('memberStartDate');
    if (inputStartDate) {
      inputStartDate.value = todayStr;
      updateExpirationDateByPlan();
    }
  };

  // ==================== NAVEGACIÓN ENTRE PESTAÑAS ====================
  const bindNavigation = () => {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTabId = btn.dataset.tab;
        switchTab(targetTabId);
      });
    });

    // Clic en tarjetas de estadísticas para filtrar directamente
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
      card.addEventListener('click', () => {
        const filterType = card.dataset.filter;
        switchTab('tab-members');
        setFilter(filterType);
      });
    });
  };

  const switchTab = (tabId) => {
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tabId);
    });

    document.querySelectorAll('.tab-content').forEach(content => {
      if (content.id === tabId) {
        content.style.display = tabId === 'tab-checkin' ? 'block' : 'block';
        content.classList.add('active');
      } else {
        content.style.display = 'none';
        content.classList.remove('active');
      }
    });

    if (tabId === 'tab-checkin') {
      const codeInput = document.getElementById('inputCode');
      if (codeInput) codeInput.focus();
    }
  };

  // ==================== SONIDO Y AUDIO ====================
  const bindSoundToggle = () => {
    const btn = document.getElementById('btnSoundToggle');
    const icon = document.getElementById('soundIcon');
    if (!btn || !icon) return;

    btn.addEventListener('click', () => {
      const isMuted = SoundManager.toggleMute();
      icon.textContent = isMuted ? '🔇' : '🔊';
      btn.title = isMuted ? 'Sonido Desactivado' : 'Sonido Activado';
    });
  };

  // ==================== RECONOCIMIENTO / CHECK-IN ====================
  const bindCheckinEvents = () => {
    const form = document.getElementById('formCheckin');
    const input = document.getElementById('inputCode');
    const keypadButtons = document.querySelectorAll('.keypad-btn');
    const btnClearLogs = document.getElementById('btnClearLogs');

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        verifyAccess();
      });
    }

    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          verifyAccess();
        }
      });
    }

    // Teclado en pantalla
    keypadButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        if (!input) return;

        if (key === 'clear') {
          input.value = '';
        } else if (key === 'back') {
          input.value = input.value.slice(0, -1);
        } else {
          input.value += key;
        }
        input.focus();
      });
    });

    if (btnClearLogs) {
      btnClearLogs.addEventListener('click', () => {
        DataManager.clearLogs();
        renderLogsList();
      });
    }
  };

  const verifyAccess = () => {
    const input = document.getElementById('inputCode');
    if (!input) return;

    const rawCode = input.value.trim();
    if (!rawCode) {
      input.focus();
      return;
    }

    const member = DataManager.getMemberByCode(rawCode);
    const resultCard = document.getElementById('checkinResultCard');

    if (!member) {
      // No encontrado
      SoundManager.playError();
      renderNotFoundResult(rawCode);
      DataManager.addLog({
        memberName: 'Desconocido',
        memberCode: rawCode,
        status: 'expired',
        message: 'Código no registrado'
      });
    } else {
      // Miembro registrado -> comprobar vencimiento
      const statusInfo = DataManager.getMembershipStatus(member.expirationDate);

      if (statusInfo.status === 'active') {
        SoundManager.playSuccess();
        renderActiveResult(member, statusInfo);
        DataManager.addLog({
          memberName: member.name,
          memberCode: member.code,
          status: 'active',
          message: 'Acceso Autorizado'
        });
      } else if (statusInfo.status === 'warning') {
        SoundManager.playWarning();
        renderWarningResult(member, statusInfo);
        DataManager.addLog({
          memberName: member.name,
          memberCode: member.code,
          status: 'warning',
          message: `Por vencer (${statusInfo.displayText})`
        });
      } else {
        // Expired
        SoundManager.playError();
        renderExpiredResult(member, statusInfo);
        DataManager.addLog({
          memberName: member.name,
          memberCode: member.code,
          status: 'expired',
          message: `Acceso Denegado (${statusInfo.displayText})`
        });
      }
    }

    input.value = '';
    input.focus();
    renderLogsList();
  };

  const renderNotFoundResult = (code) => {
    const card = document.getElementById('checkinResultCard');
    card.className = 'result-card status-expired';
    card.innerHTML = `
      <div class="result-badge badge-expired">
        ⛔ CÓDIGO NO ENCONTRADO
      </div>
      <div class="result-avatar" style="border-color: var(--status-expired); color: var(--status-expired);">?</div>
      <h2 class="result-name">Socio No Registrado</h2>
      <div class="result-code">CÓDIGO: ${escapeHTML(code)}</div>
      <p style="color: var(--text-muted); margin-bottom: 1.25rem;">
        No existe ningún miembro registrado con este código de identificación.
      </p>
      <button class="btn btn-yellow" onclick="App.openNewMemberModal('${escapeHTML(code)}')">
        + Registrar Nuevo Socio con este Código
      </button>
    `;
  };

  const renderActiveResult = (member, statusInfo) => {
    const card = document.getElementById('checkinResultCard');
    card.className = 'result-card status-active';
    card.innerHTML = `
      <div class="result-badge badge-active">
        ✅ ACCESO AUTORIZADO
      </div>
      <div class="result-avatar">${member.avatar || '💪'}</div>
      <h2 class="result-name">${escapeHTML(member.name)}</h2>
      <div class="result-code">ID: ${escapeHTML(member.code)}</div>
      
      <div class="result-details">
        <div class="result-detail-item">
          <span>Plan</span>
          <strong>${escapeHTML(member.plan)}</strong>
        </div>
        <div class="result-detail-item">
          <span>Vigencia</span>
          <strong style="color: var(--status-active);">${escapeHTML(member.expirationDate)}</strong>
        </div>
      </div>

      <div class="result-message" style="background: var(--status-active-bg); color: var(--status-active); border: 1px solid rgba(16, 185, 129, 0.3);">
        ¡Bienvenido a entrenar! Membresía activa (${statusInfo.displayText})
      </div>
    `;
  };

  const renderWarningResult = (member, statusInfo) => {
    const card = document.getElementById('checkinResultCard');
    card.className = 'result-card status-warning';
    card.innerHTML = `
      <div class="result-badge badge-warning">
        ⚠️ ATENCIÓN: MEMBRESÍA POR VENCER
      </div>
      <div class="result-avatar" style="border-color: var(--yellow-primary);">${member.avatar || '💪'}</div>
      <h2 class="result-name">${escapeHTML(member.name)}</h2>
      <div class="result-code">ID: ${escapeHTML(member.code)}</div>
      
      <div class="result-details">
        <div class="result-detail-item">
          <span>Plan</span>
          <strong>${escapeHTML(member.plan)}</strong>
        </div>
        <div class="result-detail-item">
          <span>Expira el</span>
          <strong style="color: var(--yellow-primary);">${escapeHTML(member.expirationDate)}</strong>
        </div>
      </div>

      <div class="result-message" style="background: var(--status-warning-bg); color: var(--yellow-primary); border: 1px solid rgba(255, 230, 0, 0.4); margin-bottom: 1rem;">
        ¡Pasa a recepción! Tu membresía está próxima a vencer (${statusInfo.displayText})
      </div>

      <button class="btn btn-yellow btn-sm" onclick="App.openRenewModal('${member.id}')">
        ⚡ Renovar Ahora en Recepción
      </button>
    `;
  };

  const renderExpiredResult = (member, statusInfo) => {
    const card = document.getElementById('checkinResultCard');
    card.className = 'result-card status-expired';
    card.innerHTML = `
      <div class="result-badge badge-expired">
        ⛔ ACCESO DENEGADO - MEMBRESÍA VENCIDA
      </div>
      <div class="result-avatar" style="border-color: var(--status-expired);">${member.avatar || '💪'}</div>
      <h2 class="result-name">${escapeHTML(member.name)}</h2>
      <div class="result-code">ID: ${escapeHTML(member.code)}</div>
      
      <div class="result-details">
        <div class="result-detail-item">
          <span>Plan</span>
          <strong>${escapeHTML(member.plan)}</strong>
        </div>
        <div class="result-detail-item">
          <span>Fecha de Fin</span>
          <strong style="color: var(--status-expired);">${escapeHTML(member.expirationDate)}</strong>
        </div>
      </div>

      <div class="result-message" style="background: var(--status-expired-bg); color: var(--status-expired); border: 1px solid rgba(239, 68, 68, 0.3); margin-bottom: 1rem;">
        Acceso no permitido: La membresía está vencida (${statusInfo.displayText}).
      </div>

      <button class="btn btn-yellow" onclick="App.openRenewModal('${member.id}')">
        ⚡ Renovar Membresía Ahora
      </button>
    `;
  };

  const renderLogsList = () => {
    const container = document.getElementById('logsList');
    if (!container) return;

    const logs = DataManager.getLogs();
    if (logs.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 1rem; font-size: 0.85rem;">No hay lecturas recientes en este turno.</div>`;
      return;
    }

    container.innerHTML = logs.map(log => `
      <div class="log-item ${log.status}">
        <div style="display: flex; align-items: center; gap: 0.6rem;">
          <span style="font-weight: 800; color: var(--text-main);">${escapeHTML(log.memberName)}</span>
          <span style="font-family: monospace; color: var(--yellow-primary); font-size: 0.8rem;">[${escapeHTML(log.memberCode)}]</span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.8rem;">
          <span style="font-size: 0.8rem; color: var(--text-muted);">${escapeHTML(log.message)}</span>
          <span style="font-size: 0.75rem; color: #6B7280; font-family: monospace;">${log.timestamp}</span>
        </div>
      </div>
    `).join('');
  };

  // ==================== LISTA DE MIEMBROS Y FILTROS ====================
  const bindMembersEvents = () => {
    // Búsqueda en vivo
    const inputSearch = document.getElementById('inputSearch');
    if (inputSearch) {
      inputSearch.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderMembersTable();
      });
    }

    // Botones de filtro por estado
    const filterPills = document.querySelectorAll('.filter-pill');
    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const status = pill.dataset.status;
        setFilter(status);
      });
    });

    // Ordenamiento
    const selectSort = document.getElementById('selectSort');
    if (selectSort) {
      selectSort.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderMembersTable();
      });
    }
  };

  const setFilter = (filterStatus) => {
    currentFilter = filterStatus;

    // Actualizar pills visuales
    document.querySelectorAll('.filter-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.status === filterStatus);
    });

    // Actualizar tarjetas de estadísticas superiores visualmente
    document.querySelectorAll('.stat-card').forEach(c => {
      c.classList.toggle('active-filter', c.dataset.filter === filterStatus);
    });

    renderMembersTable();
  };

  const renderMembersTable = () => {
    const tableBody = document.getElementById('membersTableBody');
    const emptyMsg = document.getElementById('emptyMembersMessage');
    if (!tableBody) return;

    let members = DataManager.getMembers();

    // 1. Filtrado por estado de vencimiento
    if (currentFilter !== 'all') {
      members = members.filter(m => {
        const statusInfo = DataManager.getMembershipStatus(m.expirationDate);
        return statusInfo.status === currentFilter;
      });
    }

    // 2. Filtrado por texto de búsqueda
    if (searchQuery) {
      members = members.filter(m => {
        const matchName = m.name && m.name.toLowerCase().includes(searchQuery);
        const matchCode = m.code && m.code.toString().toLowerCase().includes(searchQuery);
        const matchPhone = m.phone && m.phone.toLowerCase().includes(searchQuery);
        return matchName || matchCode || matchPhone;
      });
    }

    // 3. Ordenamiento
    members.sort((a, b) => {
      if (currentSort === 'expiring-asc') {
        const daysA = DataManager.calculateDaysRemaining(a.expirationDate);
        const daysB = DataManager.calculateDaysRemaining(b.expirationDate);
        return daysA - daysB; // Los que vencen antes (o ya vencidos) primero
      } else if (currentSort === 'name-asc') {
        return a.name.localeCompare(b.name);
      } else if (currentSort === 'recent') {
        return (b.id || '').localeCompare(a.id || '');
      }
      return 0;
    });

    // Actualizar tabla
    if (members.length === 0) {
      tableBody.innerHTML = '';
      if (emptyMsg) emptyMsg.style.display = 'block';
      return;
    }

    if (emptyMsg) emptyMsg.style.display = 'none';

    tableBody.innerHTML = members.map(m => {
      const statusInfo = DataManager.getMembershipStatus(m.expirationDate);
      return `
        <tr>
          <td>
            <div class="member-cell-info">
              <div class="member-table-avatar">${m.avatar || '💪'}</div>
              <div>
                <span class="member-table-name">${escapeHTML(m.name)}</span>
                <span class="member-table-phone">${escapeHTML(m.phone || 'Sin teléfono')}</span>
              </div>
            </div>
          </td>
          <td>
            <span class="result-code" style="font-size: 0.85rem; padding: 0.15rem 0.5rem;">${escapeHTML(m.code)}</span>
          </td>
          <td>
            <span style="font-weight: 600; color: #E5E7EB;">${escapeHTML(m.plan || 'Mensual')}</span>
          </td>
          <td>
            <div style="font-weight: 700; color: var(--text-main);">${escapeHTML(m.expirationDate)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${statusInfo.displayText}</div>
          </td>
          <td>
            <span class="badge-status ${statusInfo.status}">
              ${statusInfo.status === 'active' ? '🟢' : statusInfo.status === 'warning' ? '⚠️' : '⛔'}
              ${statusInfo.label}
            </span>
          </td>
          <td style="text-align: right;">
            <div class="actions-cell" style="justify-content: flex-end;">
              <button class="btn btn-yellow btn-sm" onclick="App.openRenewModal('${m.id}')" title="Renovar Membresía">
                ⚡ Renovar
              </button>
              <button class="btn btn-dark btn-sm btn-icon" onclick="App.openCarnetModal('${m.id}')" title="Ver Carnet / Credencial Digital">
                🪪
              </button>
              <button class="btn btn-dark btn-sm btn-icon" onclick="App.openEditMemberModal('${m.id}')" title="Editar Socio">
                ✏️
              </button>
              <button class="btn btn-danger btn-sm btn-icon" onclick="App.deleteMember('${m.id}')" title="Eliminar Socio">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  };

  // ==================== ACTUALIZAR CONTADORES Y ESTADÍSTICAS ====================
  const refreshStats = () => {
    const members = DataManager.getMembers();
    let total = members.length;
    let active = 0;
    let warning = 0;
    let expired = 0;

    members.forEach(m => {
      const info = DataManager.getMembershipStatus(m.expirationDate);
      if (info.status === 'active') active++;
      else if (info.status === 'warning') warning++;
      else if (info.status === 'expired') expired++;
    });

    // Actualizar cards superiores
    const elTotal = document.getElementById('statTotal');
    const elActive = document.getElementById('statActive');
    const elWarning = document.getElementById('statWarning');
    const elExpired = document.getElementById('statExpired');

    if (elTotal) elTotal.textContent = total;
    if (elActive) elActive.textContent = active;
    if (elWarning) elWarning.textContent = warning;
    if (elExpired) elExpired.textContent = expired;

    // Actualizar conteos en las píldoras de filtro
    const cAll = document.getElementById('countAll');
    const cWarning = document.getElementById('countWarning');
    const cActive = document.getElementById('countActive');
    const cExpired = document.getElementById('countExpired');

    if (cAll) cAll.textContent = total;
    if (cWarning) cWarning.textContent = warning;
    if (cActive) cActive.textContent = active;
    if (cExpired) cExpired.textContent = expired;
  };

  // ==================== MODALES Y FORMULARIOS ====================
  const bindModalEvents = () => {
    // Abrir modal de nuevo socio desde encabezado y tabla
    const btnHeader = document.getElementById('btnNewMemberHeader');
    const btnTable = document.getElementById('btnNewMemberTable');
    if (btnHeader) btnHeader.addEventListener('click', () => openNewMemberModal());
    if (btnTable) btnTable.addEventListener('click', () => openNewMemberModal());

    // Botones de cierre para cualquier modal
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.dataset.close;
        closeModal(modalId);
      });
    });

    // Cerrar al dar clic en el fondo oscuro
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('open');
        }
      });
    });

    // Generar código aleatorio en formulario
    const btnGenCode = document.getElementById('btnGenCode');
    if (btnGenCode) {
      btnGenCode.addEventListener('click', () => {
        document.getElementById('memberCode').value = generateUniqueCode();
      });
    }

    // Auto-calcular fecha de expiración según el plan seleccionado
    const planSelect = document.getElementById('memberPlan');
    const startDateInput = document.getElementById('memberStartDate');
    if (planSelect) {
      planSelect.addEventListener('change', updateExpirationDateByPlan);
    }
    if (startDateInput) {
      startDateInput.addEventListener('change', updateExpirationDateByPlan);
    }

    // Enviar formulario de miembro (crear / editar)
    const formMember = document.getElementById('formMember');
    if (formMember) {
      formMember.addEventListener('submit', (e) => {
        e.preventDefault();
        saveMemberForm();
      });
    }

    // Confirmar renovación personalizada
    const btnConfirmRenewCustom = document.getElementById('btnConfirmRenewCustom');
    if (btnConfirmRenewCustom) {
      btnConfirmRenewCustom.addEventListener('click', () => {
        const memberId = document.getElementById('renewMemberId').value;
        const customDate = document.getElementById('renewCustomDate').value;
        if (!customDate) {
          alert('Por favor selecciona una fecha válida.');
          return;
        }

        const members = DataManager.getMembers();
        const member = members.find(m => m.id === memberId);
        if (member) {
          member.expirationDate = customDate;
          DataManager.saveMember(member);
          refreshStats();
          renderMembersTable();
          closeModal('modalRenew');
        }
      });
    }
  };

  const openModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('open');
  };

  const closeModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('open');
  };

  const generateUniqueCode = () => {
    const members = DataManager.getMembers();
    let code = '';
    let exists = true;
    while (exists) {
      code = (Math.floor(1000 + Math.random() * 9000)).toString();
      exists = members.some(m => m.code === code);
    }
    return code;
  };

  const updateExpirationDateByPlan = () => {
    const plan = document.getElementById('memberPlan').value;
    const startDate = document.getElementById('memberStartDate').value || DataManager.formatDateISO(new Date());
    const expInput = document.getElementById('memberExpirationDate');

    let daysToAdd = 30;
    if (plan === 'Pase por Día') daysToAdd = 1;
    else if (plan === 'Mensual') daysToAdd = 30;
    else if (plan === 'Trimestral') daysToAdd = 90;
    else if (plan === 'Semestral') daysToAdd = 180;
    else if (plan === 'Anual') daysToAdd = 365;
    else if (plan === 'Personalizado') return;

    expInput.value = DataManager.addDaysToDate(startDate, daysToAdd);
  };

  const openNewMemberModal = (prefilledCode = '') => {
    document.getElementById('modalMemberTitle').textContent = 'Registrar Nuevo Socio';
    document.getElementById('memberId').value = '';
    document.getElementById('memberName').value = '';
    document.getElementById('memberCode').value = prefilledCode || generateUniqueCode();
    document.getElementById('memberPhone').value = '';
    document.getElementById('memberEmail').value = '';
    document.getElementById('memberPlan').value = 'Mensual';
    document.getElementById('memberAvatar').value = '💪';
    document.getElementById('memberNotes').value = '';

    const todayStr = DataManager.formatDateISO(new Date());
    document.getElementById('memberStartDate').value = todayStr;
    updateExpirationDateByPlan();

    openModal('modalMember');
    document.getElementById('memberName').focus();
  };

  const openEditMemberModal = (memberId) => {
    const members = DataManager.getMembers();
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    document.getElementById('modalMemberTitle').textContent = 'Editar Datos del Socio';
    document.getElementById('memberId').value = member.id;
    document.getElementById('memberName').value = member.name || '';
    document.getElementById('memberCode').value = member.code || '';
    document.getElementById('memberPhone').value = member.phone || '';
    document.getElementById('memberEmail').value = member.email || '';
    document.getElementById('memberPlan').value = member.plan || 'Mensual';
    document.getElementById('memberAvatar').value = member.avatar || '💪';
    document.getElementById('memberStartDate').value = member.startDate || DataManager.formatDateISO(new Date());
    document.getElementById('memberExpirationDate').value = member.expirationDate || '';
    document.getElementById('memberNotes').value = member.notes || '';

    openModal('modalMember');
  };

  const saveMemberForm = () => {
    const id = document.getElementById('memberId').value;
    const name = document.getElementById('memberName').value.trim();
    const code = document.getElementById('memberCode').value.trim().toUpperCase();
    const phone = document.getElementById('memberPhone').value.trim();
    const email = document.getElementById('memberEmail').value.trim();
    const plan = document.getElementById('memberPlan').value;
    const avatar = document.getElementById('memberAvatar').value;
    const startDate = document.getElementById('memberStartDate').value;
    const expirationDate = document.getElementById('memberExpirationDate').value;
    const notes = document.getElementById('memberNotes').value.trim();

    if (!name || !code || !startDate || !expirationDate) {
      alert('Por favor completa todos los campos obligatorios (*)');
      return;
    }

    // Verificar si el código ya lo tiene OTRO socio
    const members = DataManager.getMembers();
    const duplicate = members.find(m => m.code === code && m.id !== id);
    if (duplicate) {
      alert(`El código "${code}" ya está asignado al socio ${duplicate.name}. Por favor usa otro código único.`);
      return;
    }

    DataManager.saveMember({
      id: id || ('mem-' + Date.now()),
      name,
      code,
      phone,
      email,
      plan,
      avatar,
      startDate,
      expirationDate,
      notes
    });

    closeModal('modalMember');
    refreshStats();
    renderMembersTable();
  };

  const deleteMember = (id) => {
    const members = DataManager.getMembers();
    const member = members.find(m => m.id === id);
    if (!member) return;

    if (confirm(`¿Estás seguro de eliminar al socio "${member.name}" con código [${member.code}]?`)) {
      DataManager.deleteMember(id);
      refreshStats();
      renderMembersTable();
    }
  };

  // ==================== RENOVACIÓN RÁPIDA ====================
  const openRenewModal = (memberId) => {
    const members = DataManager.getMembers();
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    const statusInfo = DataManager.getMembershipStatus(member.expirationDate);

    document.getElementById('renewMemberId').value = member.id;
    document.getElementById('renewAvatar').textContent = member.avatar || '💪';
    document.getElementById('renewName').textContent = member.name;
    document.getElementById('renewCurrentExp').innerHTML = `
      Vence: <strong>${member.expirationDate}</strong> (${statusInfo.displayText})
    `;

    // Fecha sugerida por defecto: +30 días
    const todayStr = DataManager.formatDateISO(new Date());
    const baseDate = statusInfo.status === 'expired' ? todayStr : member.expirationDate;
    document.getElementById('renewCustomDate').value = DataManager.addDaysToDate(baseDate, 30);

    openModal('modalRenew');
  };

  const applyRenewDays = (days) => {
    const memberId = document.getElementById('renewMemberId').value;
    if (!memberId) return;

    // Si la membresía ya expiró, renueva a partir de hoy. Si no, extiende la fecha actual.
    DataManager.renewMember(memberId, days, false);
    refreshStats();
    renderMembersTable();
    closeModal('modalRenew');

    // Notificación sonora suave
    SoundManager.playSuccess();
  };

  // ==================== CARNET DIGITAL ====================
  const openCarnetModal = (memberId) => {
    const members = DataManager.getMembers();
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    const statusInfo = DataManager.getMembershipStatus(member.expirationDate);

    document.getElementById('carnetAvatar').textContent = member.avatar || '💪';
    document.getElementById('carnetName').textContent = member.name;
    document.getElementById('carnetPlan').textContent = `PLAN ${member.plan.toUpperCase()}`;
    document.getElementById('carnetPhone').textContent = member.phone ? `Tel: ${member.phone}` : 'THOR FITNESS CLUB';
    document.getElementById('carnetCodeText').textContent = `GYM-${member.code}`;
    document.getElementById('carnetExpDate').textContent = member.expirationDate;
    document.getElementById('carnetIdShort').textContent = `#${member.code}`;

    const badge = document.getElementById('carnetStatusBadge');
    badge.className = `badge-status ${statusInfo.status}`;
    badge.textContent = statusInfo.label;

    openModal('modalCarnet');
  };

  // ==================== RESPALDO Y DATOS ====================
  const bindBackupEvents = () => {
    const btnOpenBackup = document.getElementById('btnOpenBackup');
    const btnExportJSON = document.getElementById('btnExportJSON');
    const fileImportJSON = document.getElementById('fileImportJSON');
    const btnResetDemo = document.getElementById('btnResetDemo');

    if (btnOpenBackup) {
      btnOpenBackup.addEventListener('click', () => openModal('modalBackup'));
    }

    if (btnExportJSON) {
      btnExportJSON.addEventListener('click', () => {
        const jsonStr = DataManager.exportData();
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `thor-gym-respaldo-${DataManager.formatDateISO(new Date())}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }

    if (fileImportJSON) {
      fileImportJSON.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
          const success = DataManager.importData(evt.target.result);
          if (success) {
            alert('¡Datos restaurados correctamente!');
            refreshStats();
            renderMembersTable();
            renderLogsList();
            closeModal('modalBackup');
          } else {
            alert('El archivo JSON no tiene un formato válido.');
          }
        };
        reader.readAsText(file);
      });
    }

    if (btnResetDemo) {
      btnResetDemo.addEventListener('click', () => {
        if (confirm('¿Restablecer todos los miembros a los datos iniciales de prueba? Se reemplazarán los datos actuales.')) {
          DataManager.resetToDemo();
          refreshStats();
          renderMembersTable();
          renderLogsList();
          closeModal('modalBackup');
        }
      });
    }
  };

  // Helper para pruebas rápidas
  const testCode = (code) => {
    const input = document.getElementById('inputCode');
    if (input) {
      input.value = code;
      verifyAccess();
    }
  };

  // Escape HTML para seguridad en cadenas
  const escapeHTML = (str) => {
    if (!str) return '';
    return str.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // API pública
  return {
    init,
    testCode,
    openNewMemberModal,
    openEditMemberModal,
    openRenewModal,
    openCarnetModal,
    applyRenewDays,
    deleteMember
  };
})();

// Iniciar aplicación al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
