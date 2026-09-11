import { describe, it, expect } from 'vitest';
import { normalizeAddress, normalizeText, getSectionTitle } from './addressUtils';

describe('addressUtils', () => {
  it('should normalize Chilean addresses by removing prefixes, accents and symbols', () => {
    const raw = 'Avenida Providencia #1234, Depto 402, Comuna de Providencia';
    const norm = normalizeAddress(raw);
    expect(norm).not.toContain('avenida');
    expect(norm).not.toContain('depto');
    expect(norm).not.toContain('#');
    expect(norm).toBe('providencia1234402providencia');
  });

  it('should normalize names removing accents and special symbols', () => {
    expect(normalizeText('Inmobiliaria Los Álamos SpA')).toBe('inmobiliarialosalamosspa');
    expect(normalizeText('Carlos Muñoz & Cía.')).toBe('carlosmunozcia');
  });

  it('should identify company / succession section titles accurately', () => {
    expect(getSectionTitle(['Sucesión González'], 'dueno')).toBe('PROPIEDAD: SUCESIÓN');
    expect(getSectionTitle(['Constructora Beta SpA'], 'arrendatario')).toBe('SOCIEDAD / EMPRESA');
    expect(getSectionTitle(['Juan Pérez'], 'dueno')).toBe('PROPIETARIO / SOCIEDAD');
    expect(getSectionTitle(['Pedro Soto'], 'arrendatario')).toBe('ARRENDATARIO / INQUILINOS');
  });

  it('should correctly normalize address and tenant for Contrato Prueba', () => {
    const rawAddr = 'EL KIOSCO, ubicado en Avenida Santelices frente al número 351, comuna Isla de Maipo, ciudad de Santiago, Región Metropolitana';
    const norm = normalizeAddress(rawAddr);
    expect(norm).toContain('santelices');
    expect(norm).toContain('351');

    const rawTenant = 'CARLOS ANDRES NUÑEZ VALENZUELA';
    const normTenant = normalizeText(rawTenant);
    expect(normTenant).toBe('carlosandresnunezvalenzuela');
  });
});
