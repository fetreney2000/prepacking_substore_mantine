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

/**
 * Stylesheet for the column-toggle bar shown in both print popups.
 * It used to be copy-pasted verbatim into edit-order and sku-report
 * (verified byte-identical before extracting it — review item #19).
 */
export const PRINT_TOGGLE_STYLE = `.col-toggle-bar{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}.col-toggle-bar label{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border:1px solid #ccc;border-radius:6px;background:#f5f5f5;font-size:11px;cursor:pointer;user-select:none}.col-toggle-bar input{display:none}.toggle-slider{width:28px;height:16px;background:#cbd5e1;border-radius:8px;position:relative;transition:background .2s;flex-shrink:0;display:inline-block}.toggle-slider::after{content:'';position:absolute;width:12px;height:12px;background:#fff;border-radius:50%;top:2px;left:2px;transition:transform .2s;box-shadow:0 1px 2px rgba(0,0,0,.2)}.col-toggle-bar input:checked+.toggle-slider{background:#2563eb}.col-toggle-bar input:checked+.toggle-slider::after{transform:translateX(12px)}.col-toggle-bar .toggle-label{font-size:11px;color:#333}@media print{.col-toggle-bar{display:none!important}.col-hidden,.col-hidden *{display:none!important}}`;

export interface PrintToggle {
  /** Visible caption, e.g. "Min/Penimbal/Maks". */
  label: string;
  /** CSS selectors of the columns this switch shows and hides. */
  selectors: string[];
}

/**
 * Markup for that toggle bar: one switch per group of columns, wired to add
 * or remove `col-hidden` on them inside the printed document.
 */
export function buildPrintToggleBar(toggles: PrintToggle[]): string {
  const labels = toggles.map(({ label, selectors }) => {
    const query = selectors.join(',');
    return (
      `<label onclick="var c=this.querySelector('input');c.checked=!c.checked;` +
      `document.querySelectorAll('${query}').forEach(function(el){el.classList.toggle('col-hidden',!c.checked)})">` +
      `<input type="checkbox" checked><span class="toggle-slider"></span>` +
      `<span class="toggle-label">${escapeHtml(label)}</span></label>`
    );
  });
  return `\n    <div class="col-toggle-bar">\n      ${labels.join('\n      ')}\n    </div>`;
}
