/**
 * Utilidades para manejo de fechas, vencimientos y formateo para Punto Propiedades.
 */

/**
 * Formatea fecha YYYY-MM-DD → DD-MM-YYYY
 */
export const formatDateDMY = (dateStr?: string): string => {
  if (!dateStr) return 'N/A';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

/**
 * Parser de fechas flexible que tolera formatos DD/MM/YYYY, DD-MM-YYYY y YYYY-MM-DD.
 * Fija la hora a mediodía (12:00:00) para evitar desfases de zona horaria UTC-4 / UTC-3.
 */
export const parseExpiryDate = (terminoStr?: string): Date | null => {
  if (!terminoStr) return null;
  let d: Date | null = null;
  const str = String(terminoStr).trim();

  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      const d1 = parseInt(parts[0], 10);
      const d2 = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      if (!isNaN(d1) && !isNaN(d2) && !isNaN(year)) {
        d = new Date(year, d2 - 1, d1, 12, 0, 0);
      }
    }
  } else if (str.includes('-')) {
    const parts = str.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          d = new Date(year, month - 1, day, 12, 0, 0);
        }
      } else {
        // DD-MM-YYYY
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          d = new Date(year, month - 1, day, 12, 0, 0);
        }
      }
    }
  }

  if (!d || isNaN(d.getTime())) {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      d = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0);
    }
  }

  if (d && !isNaN(d.getTime())) {
    d.setHours(12, 0, 0, 0);
    return d;
  }
  return null;
};

/**
 * Agrega N meses a una fecha en formato YYYY-MM-DD y retorna YYYY-MM-DD.
 */
export const addMonthsToDate = (startDateStr: string, months: number): string => {
  if (!startDateStr) return '';
  const date = new Date(startDateStr + 'T00:00:00');
  if (isNaN(date.getTime())) return startDateStr;
  date.setMonth(date.getMonth() + Number(months));
  return date.toISOString().split('T')[0];
};

/**
 * Calcula la fecha de expiración sumando meses de duración a la fecha de inicio.
 */
export const calculateExpiry = (startDate: string, months: number = 12): string => {
  return addMonthsToDate(startDate, months);
};

/**
 * Evalúa si una fecha ya expiró respecto al momento actual.
 */
export const isExpired = (dateStr?: string): boolean => {
  if (!dateStr) return false;
  const date = parseExpiryDate(dateStr) || new Date(dateStr);
  if (isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

/**
 * Calcula el estado de vencimiento: si es candidato a aviso (vencido o vence antes del fin del mes siguiente).
 */
export const getExpiryStatus = (terminoStr?: string): {
  isExpiryCandidate: boolean;
  isExpired: boolean;
  daysRemaining: number;
} => {
  if (!terminoStr) return { isExpiryCandidate: false, isExpired: false, daysRemaining: 0 };
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiryDate = parseExpiryDate(terminoStr);

  if (!expiryDate || isNaN(expiryDate.getTime())) {
    return { isExpiryCandidate: false, isExpired: false, daysRemaining: 0 };
  }

  // Candidatos: vencidos o que vencen hasta el fin del próximo mes
  const maxDate = new Date(today.getFullYear(), today.getMonth() + 2, 0, 23, 59, 59);
  const isExpiryCandidate = expiryDate <= maxDate;
  const expired = expiryDate < today;

  const diffTime = expiryDate.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return { isExpiryCandidate, isExpired: expired, daysRemaining };
};
