import { describe, expect, it } from 'vitest';
import { formatInteger, formatMoney, formatPercent } from './format';

describe('formatInteger', () => {
  it('space-groups thousands', () => {
    expect(formatInteger(84210)).toBe('84 210');
    expect(formatInteger(1250000)).toBe('1 250 000');
    expect(formatInteger(999)).toBe('999');
    expect(formatInteger(0)).toBe('0');
  });
  it('rounds and keeps sign', () => {
    expect(formatInteger(1234.6)).toBe('1 235');
    expect(formatInteger(-1500)).toBe('-1 500');
  });
});

describe('formatMoney', () => {
  it("formats UZS as integer + so'm (case-insensitive code)", () => {
    expect(formatMoney(1250000, 'UZS')).toBe("1 250 000 so'm");
    expect(formatMoney(36764.7, 'uzs')).toBe("36 765 so'm");
  });
  it('formats known currencies with symbol + 2 decimals', () => {
    expect(formatMoney(1250.5, 'USD')).toBe('$1 250.50');
    expect(formatMoney(1250.5, 'EUR')).toBe('€1 250.50');
  });
  it('falls back to a code suffix for unknown currencies', () => {
    expect(formatMoney(1250.5, 'PLN')).toBe('1 250.50 PLN');
  });
});

describe('formatPercent', () => {
  it('renders one decimal', () => {
    expect(formatPercent(2.4)).toBe('2.4');
    expect(formatPercent(2)).toBe('2.0');
  });
});
