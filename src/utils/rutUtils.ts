/**
 * Utilidades para formateo, limpieza y validación de RUT chileno.
 */

export const cleanRut = (rut?: string): string => {
  if (!rut || rut === 'N/A') return '';
  return rut.replace(/[^0-9Kk]/g, '').toUpperCase();
};

export const formatRut = (rut?: string): string => {
  if (!rut || rut === 'N/A') return 'N/A';
  const cleaned = cleanRut(rut);
  if (cleaned.length < 2) return cleaned;
  const dv = cleaned.slice(-1);
  const body = cleaned.slice(0, -1);
  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
};

export const validateRut = (rut?: string): boolean => {
  const cleaned = cleanRut(rut);
  if (cleaned.length < 8) return false;
  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);

  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const expectedDvNumber = 11 - (sum % 11);
  let expectedDv = '';
  if (expectedDvNumber === 11) expectedDv = '0';
  else if (expectedDvNumber === 10) expectedDv = 'K';
  else expectedDv = expectedDvNumber.toString();

  return dv === expectedDv;
};
