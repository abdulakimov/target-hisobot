/**
 * Currency-aware money + number formatting (PLAN.md §11).
 * - UZS: integer, space-grouped thousands, "so'm" suffix → "1 250 000 so'm".
 * - Known currencies: 2 decimals, space-grouped, symbol prefix → "$1 250.50".
 * - Otherwise: 2 decimals + currency code suffix → "1 250.50 PLN".
 * The thousands separator is always a plain space — locale-independent, deterministic output.
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  RUB: '₽',
  UAH: '₴',
  KZT: '₸',
  TRY: '₺',
};

/** Insert a space every 3 digits from the right: "1250000" → "1 250 000". */
function groupDigits(intDigits: string): string {
  return intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Integer with space-grouped thousands (rounds, keeps sign). */
export function formatInteger(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round(value);
  const sign = rounded < 0 ? '-' : '';
  return sign + groupDigits(Math.abs(rounded).toString());
}

/** Number with fixed decimals and space-grouped thousands. */
function formatDecimal(value: number, decimals: number): string {
  if (!Number.isFinite(value)) return (0).toFixed(decimals);
  const sign = value < 0 ? '-' : '';
  const fixed = Math.abs(value).toFixed(decimals);
  const [intPart, fracPart] = fixed.split('.');
  const grouped = groupDigits(intPart);
  return sign + (fracPart ? `${grouped}.${fracPart}` : grouped);
}

/**
 * Format a monetary amount in the account's currency.
 * UZS → integer + " so'm"; known symbol → "$1 250.50"; else → "1 250.50 CUR".
 */
export function formatMoney(amount: number, currency: string): string {
  const code = (currency ?? '').toUpperCase();
  if (code === 'UZS') {
    return `${formatInteger(amount)} so'm`;
  }
  const formatted = formatDecimal(amount, 2);
  const symbol = CURRENCY_SYMBOLS[code];
  if (symbol) return `${symbol}${formatted}`;
  return code ? `${formatted} ${code}` : formatted;
}

/** Percentage value (already in percent units), one decimal: 2.4 → "2.4". */
export function formatPercent(value: number): string {
  return formatDecimal(value, 1);
}
