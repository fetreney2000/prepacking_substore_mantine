import { describe, expect, it } from 'vitest';
import { escapeHtml } from './print';

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
