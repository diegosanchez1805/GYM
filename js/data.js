/**
 * data.js - Manejo del almacén de datos (localStorage), cálculos de vencimiento y miembros demo
 */

const DataManager = (() => {
  const STORAGE_KEY = 'THOR_GYM_MEMBERS_V1';
  const OLD_STORAGE_KEY = 'TITAN_GYM_MEMBERS_V1';
  const LOGS_KEY = 'THOR_GYM_LOGS_V1';
  const OLD_LOGS_KEY = 'TITAN_GYM_LOGS_V1';

  // Utilidad para formatear fechas en YYYY-MM-DD
  const formatDateISO = (date) => {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
  };

  // Sumar días a una fecha
  const addDaysToDate = (startDateStr, days) => {
    const date = new Date(startDateStr + 'T12:00:00');
    date.setDate(date.getDate() + parseInt(days, 10));
    return formatDateISO(date);
  };

  // Sumar meses exactos de calendario (Ej. 10 de octubre -> 10 de noviembre)
  // Con ajuste al último día del mes si el día no existe (Ej. 31 de enero -> 28 de febrero)
  const addMonthsToDate = (startDateStr, months) => {
    if (!startDateStr) return '';
    const parts = startDateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed
    const day = parseInt(parts[2], 10);

    const numMonths = parseInt(months, 10);
    const totalMonths = month + numMonths;
    const targetYear = year + Math.floor(totalMonths / 12);
    const targetMonth = ((totalMonths % 12) + 12) % 12;

    // Obtener días disponibles en el mes destino
    const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const finalDay = Math.min(day, daysInTargetMonth);

    const mm = String(targetMonth + 1).padStart(2, '0');
    const dd = String(finalDay).padStart(2, '0');
    return targetYear + '-' + mm + '-' + dd;
  };

  // Sumar años exactos de calendario
  const addYearsToDate = (startDateStr, years) => {
    return addMonthsToDate(startDateStr, parseInt(years, 10) * 12);
  };

  // Calcular vencimiento exacto según el plan
  const calculatePlanExpiration = (startDateStr, planName) => {
    const plan = (planName || '').trim();
    if (plan.includes('Pase') || plan.includes('1 día')) {
      return addDaysToDate(startDateStr, 1);
    } else if (plan.includes('Semanal') || plan.includes('7 días')) {
      return addDaysToDate(startDateStr, 7);
    } else if (plan.includes('Mensual') || plan.includes('Mes')) {
      return addMonthsToDate(startDateStr, 1);
    } else if (plan.includes('Trimestral') || plan.includes('90')) {
      return addMonthsToDate(startDateStr, 3);
    } else if (plan.includes('Semestral') || plan.includes('180') || plan.includes('6 Mes')) {
      return addMonthsToDate(startDateStr, 6);
    } else if (plan.includes('Anual') || plan.includes('365') || plan.includes('Año')) {
      return addYearsToDate(startDateStr, 1);
    }
    return addMonthsToDate(startDateStr, 1);
  };

  // Calcular días restantes respecto a hoy
  const calculateDaysRemaining = (expirationDateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const expDate = new Date(expirationDateStr + 'T00:00:00');
    expDate.setHours(0, 0, 0, 0);

    const diffTime = expDate.getTime() - today.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  // Obtener estado: 'active', 'warning' (por vencer en 7 días o menos), 'expired'
  const getMembershipStatus = (expirationDateStr) => {
    const days = calculateDaysRemaining(expirationDateStr);
    if (days < 0) {
      return {
        status: 'expired',
        label: 'Vencido',
        days: days,
        displayText: `Vencido hace ${Math.abs(days)} día${Math.abs(days) === 1 ? '' : 's'}`
      };
    } else if (days <= 7) {
      return {
        status: 'warning',
        label: 'Por Vencer',
        days: days,
        displayText: days === 0 ? '¡Vence Hoy!' : `Vence en ${days} día${days === 1 ? '' : 's'}`
      };
    } else {
      return {
        status: 'active',
        label: 'Activo',
        days: days,
        displayText: `Vence en ${days} días`
      };
    }
  };

  // Generar datos demo dinámicos relativos a la fecha de ejecución
  const generateInitialDemoData = () => {
    const today = new Date();
    
    return [
      {
        id: 'mem-1',
        code: '1001',
        name: 'Carlos Mendoza',
        phone: '55 1234 5678',
        email: 'carlos.mendoza@email.com',
        plan: 'Mensual',
        startDate: formatDateISO(new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000)),
        expirationDate: formatDateISO(new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000)),
        avatar: '💪',
        notes: 'Entrenamiento de fuerza / hipertrofia'
      },
      {
        id: 'mem-2',
        code: '1002',
        name: 'Valeria Gómez',
        phone: '55 8765 4321',
        email: 'valeria.g@email.com',
        plan: 'Mensual',
        startDate: formatDateISO(new Date(today.getTime() - 27 * 24 * 60 * 60 * 1000)),
        expirationDate: formatDateISO(new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)), // Por vencer en 3 días!
        avatar: '🏃‍♀️',
        notes: 'Crossfit y cardio matutino'
      },
      {
        id: 'mem-3',
        code: '1003',
        name: 'Rodrigo Salazar',
        phone: '55 4321 8765',
        email: 'rodrigo.s@email.com',
        plan: 'Trimestral',
        startDate: formatDateISO(new Date(today.getTime() - 89 * 24 * 60 * 60 * 1000)),
        expirationDate: formatDateISO(new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000)), // ¡Por vencer mañana!
        avatar: '🥊',
        notes: 'Clases de boxeo por la tarde'
      },
      {
        id: 'mem-4',
        code: '1004',
        name: 'Lucía Fernández',
        phone: '55 9988 7766',
        email: 'lucia.f@email.com',
        plan: 'Mensual',
        startDate: formatDateISO(new Date(today.getTime() - 35 * 24 * 60 * 60 * 1000)),
        expirationDate: formatDateISO(new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000)), // ¡Vencido hace 5 días!
        avatar: '🧘‍♀️',
        notes: 'Pendiente renovar plan semestral'
      },
      {
        id: 'mem-5',
        code: '1005',
        name: 'Alejandro Ramos',
        phone: '55 6677 8899',
        email: 'alejandro.r@email.com',
        plan: 'Anual VIP',
        startDate: formatDateISO(new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000)),
        expirationDate: formatDateISO(new Date(today.getTime() + 305 * 24 * 60 * 60 * 1000)),
        avatar: '🏋️‍♂️',
        notes: 'Socio VIP - Acceso a todas las áreas'
      },
      {
        id: 'mem-6',
        code: '1006',
        name: 'Mariana Castro',
        phone: '55 3344 5566',
        email: 'mariana.c@email.com',
        plan: 'Mensual',
        startDate: formatDateISO(new Date(today.getTime() - 25 * 24 * 60 * 60 * 1000)),
        expirationDate: formatDateISO(new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000)), // Por vencer en 5 días
        avatar: '🚴‍♀️',
        notes: 'Spinning y nutrición'
      },
      {
        id: 'mem-7',
        code: '1007',
        name: 'Fernando Morales',
        phone: '55 5544 3322',
        email: 'fernando.m@email.com',
        plan: 'Pase por Día',
        startDate: formatDateISO(new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)),
        expirationDate: formatDateISO(new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000)), // Vencido ayer
        avatar: '⚡',
        notes: 'Pase de prueba'
      }
    ];
  };

  // Inicialización de datos
  const loadMembers = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(OLD_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error al leer de localStorage:', e);
    }
    const demo = generateInitialDemoData();
    saveAllMembers(demo);
    return demo;
  };

  const saveAllMembers = (members) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
    } catch (e) {
      console.error('Error al guardar en localStorage:', e);
    }
  };

  return {
    formatDateISO,
    addDaysToDate,
    addMonthsToDate,
    addYearsToDate,
    calculatePlanExpiration,
    calculateDaysRemaining,
    getMembershipStatus,

    // Obtener todos los miembros
    getMembers: () => {
      return loadMembers();
    },

    // Buscar miembro por código exacto (insensible a mayúsculas/espacios)
    getMemberByCode: (code) => {
      if (!code) return null;
      const cleanCode = code.toString().trim().toUpperCase();
      const members = loadMembers();
      return members.find(m => m.code.toString().trim().toUpperCase() === cleanCode) || null;
    },

    // Guardar o actualizar miembro
    saveMember: (memberData) => {
      const members = loadMembers();
      const index = members.findIndex(m => m.id === memberData.id);

      if (index !== -1) {
        // Actualización
        members[index] = { ...members[index], ...memberData };
      } else {
        // Creación
        const newMember = {
          id: memberData.id || 'mem-' + Date.now(),
          ...memberData
        };
        members.unshift(newMember);
      }

      saveAllMembers(members);
      return memberData;
    },

    // Eliminar miembro
    deleteMember: (id) => {
      let members = loadMembers();
      members = members.filter(m => m.id !== id);
      saveAllMembers(members);
      return true;
    },

    // Renovar membresía (soporta unidad: 'month', 'year', 'week', 'day' o días numéricos)
    renewMember: (id, amount, unit = 'day', fromToday = false) => {
      const members = loadMembers();
      const member = members.find(m => m.id === id);
      if (!member) return null;

      const todayStr = formatDateISO(new Date());
      let baseDateStr = member.expirationDate;

      // Si está vencida o el usuario prefiere renovar desde hoy:
      const daysLeft = calculateDaysRemaining(member.expirationDate);
      if (fromToday || daysLeft < 0) {
        baseDateStr = todayStr;
      }

      if (unit === 'month') {
        member.expirationDate = addMonthsToDate(baseDateStr, amount);
      } else if (unit === 'year') {
        member.expirationDate = addYearsToDate(baseDateStr, amount);
      } else if (unit === 'week') {
        member.expirationDate = addDaysToDate(baseDateStr, amount * 7);
      } else {
        // Conversión inteligente de días tradicionales a meses calendario exactos
        const num = parseInt(amount, 10);
        if (num === 30) {
          member.expirationDate = addMonthsToDate(baseDateStr, 1);
        } else if (num === 90) {
          member.expirationDate = addMonthsToDate(baseDateStr, 3);
        } else if (num === 180) {
          member.expirationDate = addMonthsToDate(baseDateStr, 6);
        } else if (num === 365) {
          member.expirationDate = addYearsToDate(baseDateStr, 1);
        } else {
          member.expirationDate = addDaysToDate(baseDateStr, num);
        }
      }

      saveAllMembers(members);
      return member;
    },

    // Historial de accesos
    getLogs: () => {
      try {
        const stored = localStorage.getItem(LOGS_KEY) || localStorage.getItem(OLD_LOGS_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch (e) {
        return [];
      }
    },

    addLog: (logEntry) => {
      try {
        const logs = DataManager.getLogs();
        logs.unshift({
          id: 'log-' + Date.now(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          date: formatDateISO(new Date()),
          ...logEntry
        });
        // Mantener últimos 50 registros
        if (logs.length > 50) logs.pop();
        localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
      } catch (e) {
        console.error('Error al guardar log:', e);
      }
    },

    clearLogs: () => {
      localStorage.removeItem(LOGS_KEY);
    },

    // Exportar e Importar
    exportData: () => {
      const data = {
        members: loadMembers(),
        logs: DataManager.getLogs(),
        exportedAt: new Date().toISOString()
      };
      return JSON.stringify(data, null, 2);
    },

    importData: (jsonString) => {
      try {
        const parsed = JSON.parse(jsonString);
        if (Array.isArray(parsed.members)) {
          saveAllMembers(parsed.members);
          if (Array.isArray(parsed.logs)) {
            localStorage.setItem(LOGS_KEY, JSON.stringify(parsed.logs));
          }
          return true;
        }
      } catch (e) {
        console.error('JSON inválido:', e);
      }
      return false;
    },

    resetToDemo: () => {
      const demo = generateInitialDemoData();
      saveAllMembers(demo);
      DataManager.clearLogs();
      return demo;
    }
  };
})();
