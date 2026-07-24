/**
 * Keep the form/API value as a plain decimal string while accepting formatted
 * values pasted into the input.
 */
export function normalizeDecimalInput(value: string): string {
  return value
    .replace(/[^\d.]/g, "")
    .replace(/(\..*)\./g, "$1");
}

/**
 * Add grouping separators for display without converting through Number, which
 * would remove trailing decimal zeros and can lose precision for large values.
 */
export function formatDecimalInput(value: string): string {
  if (!value) return "";

  const decimalIndex = value.indexOf(".");
  const integerPart = decimalIndex === -1 ? value : value.slice(0, decimalIndex);
  const decimalPart = decimalIndex === -1 ? null : value.slice(decimalIndex + 1);
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return decimalPart === null
    ? groupedInteger
    : `${groupedInteger}.${decimalPart}`;
}
