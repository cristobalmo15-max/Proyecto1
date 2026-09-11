/**
 * Utilidades para normalización de direcciones, textos y huellas digitales de archivos.
 */

export const normalizeAddress = (addr: string): string => {
  if (!addr) return '';
  return addr
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Limpiar acentos
    .replace(/\b(calle|av|avenida|pasaje|pje|nro|n|numero|num|de|la|el|los|las|departamento|depto|unidad|casa|block|lote|isla|maipo|comuna|region|metropolitana)\b/gi, '')
    .replace(/[^a-z0-9]/g, '') // Eliminar símbolos y puntuación
    .trim();
};

export const normalizeText = (text: string): string => {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
};

/**
 * Calcula una huella digital (hash SHA-256) rápida de los primeros 64KB de un archivo
 * para detectar archivos idénticos en procesamiento masivo.
 */
export const getFileFingerprint = async (file: File): Promise<string> => {
  try {
    const chunk = file.slice(0, 64 * 1024);
    const arrayBuffer = await chunk.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `${file.size}-${hashHex}`;
  } catch (err) {
    return `${file.name}-${file.size}-${file.lastModified}`;
  }
};

/**
 * Determina el título de la sección según los nombres identificados (persona, sociedad, sucesión, etc.)
 */
export const getSectionTitle = (names: string[], type: 'dueno' | 'arrendatario'): string => {
  const fullNamesList = names.join(' ').toUpperCase();
  if (fullNamesList.includes('SUCESION') || fullNamesList.includes('SUCESIÓN')) return 'PROPIEDAD: SUCESIÓN';
  if (fullNamesList.includes('SOCIEDAD') || fullNamesList.includes('SPA') || fullNamesList.includes('LTDA') || fullNamesList.includes(' S . A .')) return 'SOCIEDAD / EMPRESA';
  if (fullNamesList.includes('MUNICIPALIDAD')) return 'ENTIDAD PÚBLICA';
  return type === 'dueno' ? 'PROPIETARIO / SOCIEDAD' : 'ARRENDATARIO / INQUILINOS';
};
