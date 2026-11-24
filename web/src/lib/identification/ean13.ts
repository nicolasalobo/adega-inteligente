/** EAN-13 helpers shared by the browser and server. */
export function isValidEan13(value: string): boolean {
  if (!/^\d{13}$/.test(value)) return false;

  const digits = Array.from(value, Number);
  const weightedTotal = digits.slice(0, 12).reduce(
    (total, digit, index) => total + digit * (index % 2 === 0 ? 1 : 3),
    0,
  );

  return (10 - (weightedTotal % 10)) % 10 === digits[12];
}

/** Accept common human formatting while rejecting every non-EAN character. */
export function normalizeEan13(value: string): string | null {
  const normalized = value.trim().replace(/[\s-]/g, "");
  return isValidEan13(normalized) ? normalized : null;
}
