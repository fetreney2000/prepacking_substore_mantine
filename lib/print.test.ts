import { describe, expect, it } from 'vitest';
import { PRINT_TOGGLE_STYLE, buildPrintToggleBar, escapeHtml } from './print';

describe('escapeHtml', () => {
  it('neutralises script and style breakouts', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(escapeHtml('</style><style>body{display:none}</style>')).toBe(
      '&lt;/style&gt;&lt;style&gt;body{display:none}&lt;/style&gt;'
    );
    expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe(
      '&lt;img src=x onerror=alert(1)&gt;'
    );
    expect(escapeHtml('</script><script src=https://evil.test/x.js></script>')).toBe(
      '&lt;/script&gt;&lt;script src=https://evil.test/x.js&gt;&lt;/script&gt;'
    );
  });

  it('escapes quotes, so a value can never break out of an attribute', () => {
    expect(escapeHtml('" onmouseover="alert(1)')).toBe('&quot; onmouseover=&quot;alert(1)');
    expect(escapeHtml("' onfocus='alert(1)")).toBe('&#39; onfocus=&#39;alert(1)');
  });

  it('escapes ampersands first so entities are not re-decoded', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B');
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
    expect(escapeHtml('AT&T > Everyone')).toBe('AT&amp;T &gt; Everyone');
  });

  it('renders null and undefined as an empty string', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('stringifies anything else', () => {
    expect(escapeHtml(42)).toBe('42');
    expect(escapeHtml(0)).toBe('0');
    expect(escapeHtml('')).toBe('');
    expect(escapeHtml('50%')).toBe('50%');
  });

  it('covers the shapes the print builders actually send', () => {
    const item = { kod: 'X1<script>', nama: 'Amox & "Co"', notes: "note's <b>bold</b>" };
    const html =
      `<td class="pc-kod"><code>${escapeHtml(item.kod)}</code></td>` +
      `<td class="pc-nama">${escapeHtml(item.nama)}</td>` +
      `<td>${escapeHtml(item.notes)}</td>`;
    expect(html).toBe(
      '<td class="pc-kod"><code>X1&lt;script&gt;</code></td>' +
        '<td class="pc-nama">Amox &amp; &quot;Co&quot;</td>' +
        '<td>note&#39;s &lt;b&gt;bold&lt;/b&gt;</td>'
    );
  });

  it('leaves no raw angle brackets after escaping hostile input', () => {
    const hostile = [
      '<script>alert(1)</script>',
      '<img src=x onerror=alert(1)>',
      '"><svg/onload=alert(1)>',
      '</table><iframe src=javascript:alert(1)>',
      '<b>bold</b>',
    ];
    for (const input of hostile) {
      expect(escapeHtml(input)).not.toMatch(/[<>]/);
    }
  });
});

describe('buildPrintToggleBar', () => {
  it('emits the exact wiring the print popups relied on', () => {
    const html = buildPrintToggleBar([{ label: 'Kod', selectors: ['.pc-kod'] }]);
    expect(html).toContain('<div class="col-toggle-bar">');
    expect(html).toContain(
      `onclick="var c=this.querySelector('input');c.checked=!c.checked;` +
        `document.querySelectorAll('.pc-kod').forEach(function(el){el.classList.toggle('col-hidden',!c.checked)})"`
    );
    expect(html).toContain('<input type="checkbox" checked>');
    expect(html).toContain('<span class="toggle-label">Kod</span>');
    expect(html).toContain('</div>');
  });

  it('joins several selectors into one switch', () => {
    const html = buildPrintToggleBar([
      { label: 'Min/Penimbal/Maks', selectors: ['.pc-min', '.pc-penimbal', '.pc-maks'] },
    ]);
    expect(html).toContain("querySelectorAll('.pc-min,.pc-penimbal,.pc-maks')");
  });

  it('builds one label per toggle', () => {
    const html = buildPrintToggleBar([
      { label: 'A', selectors: ['.a'] },
      { label: 'B', selectors: ['.b'] },
      { label: 'C', selectors: ['.c'] },
    ]);
    expect((html.match(/<label /g) ?? []).length).toBe(3);
  });

  it('escapes the caption', () => {
    const html = buildPrintToggleBar([{ label: '<b>x</b>', selectors: ['.a'] }]);
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(html).not.toContain('<b>x</b>');
  });
});

describe('PRINT_TOGGLE_STYLE', () => {
  it('keeps the toggle bar out of the printed output', () => {
    expect(PRINT_TOGGLE_STYLE).toContain('.col-toggle-bar{display:flex');
    expect(PRINT_TOGGLE_STYLE).toContain('@media print');
    expect(PRINT_TOGGLE_STYLE).toContain('.col-hidden,.col-hidden *{display:none!important}');
    expect(PRINT_TOGGLE_STYLE.length).toBeGreaterThan(500);
  });
});
