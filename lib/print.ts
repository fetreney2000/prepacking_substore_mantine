/**
 * Helpers for building the printable HTML popups
 * (`window.open('', '_blank')` + `document.write(...)`).
 *
 * Those popups inherit the app's origin, so anything interpolated into the
 * document is executed in the app's origin. Every value that comes from the
 * database or from user input MUST pass through `escapeHtml` here.
 */

/**
 * Escape a value for interpolation into HTML text or an attribute.
 * `null`/`undefined` become an empty string — keep any `?? '-'` fallbacks at
 * the call site so the placeholder is still visible.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
