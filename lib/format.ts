export function formatNum(n: number | undefined | null): string {
  return Number(n || 0).toLocaleString('ms-MY');
}

/**
 * `YYYY-MM-DD` in the browser's LOCAL time.
 *
 * `date.toISOString().slice(0, 10)` is UTC — between 00:00 and 07:59 in
 * UTC+8 it returns *yesterday's* date, which is how the order date field
 * used to be prefilled (review item #11).
 */
export function localDateStr(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
