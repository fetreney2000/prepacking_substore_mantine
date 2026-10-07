import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { renderToStaticMarkup } from 'react-dom/server';
import ColumnToggle from './ColumnToggle';

// createElement rather than JSX: same convention as ColorSchemeToggle.test.
const columns = [
  { key: 'kod', label: 'Kod', visible: true, onChange: () => {} },
  { key: 'nama', label: 'Nama', visible: false, onChange: () => {} },
];

const render = (label?: string) =>
  renderToStaticMarkup(
    createElement(
      MantineProvider,
      null,
      createElement(ColumnToggle, { columns, ...(label === undefined ? {} : { label }) })
    )
  );

describe('ColumnToggle', () => {
  it('renders both variants, each gated to its own viewport', () => {
    const html = render();
    // The inline switch row only shows from `sm` up …
    expect(html).toMatch(/<div[^>]*mantine-visible-from-sm/);
    // … and the compact phone button is hidden from `sm` up. Without these
    // two gates a phone would get the switch wall this component exists to
    // avoid, or a desktop would get a pointless popover button.
    expect(html).toMatch(/<div[^>]*mantine-hidden-from-sm/);
  });

  it('uses the 24px md switch, never the 16px xs track', () => {
    const html = render();
    // WCAG 2.5.8 (AA) wants a 24x24px target; the old `size="xs"` track was
    // 16px. Vars land on the switch root as an inline custom property.
    expect(html).not.toContain('--switch-height-xs');
    expect(html.match(/--switch-height:var\(--switch-height-md\)/g)).toHaveLength(
      columns.length
    );
  });

  it('labels the phone button with the section name and visible count', () => {
    // One of two columns is visible in the fixture.
    expect(render()).toContain('Paparan Kolum (1/2)');
    // Report pages pass their own heading so the button matches its section.
    expect(render('Paparkan Tunjang')).toContain('Paparkan Tunjang (1/2)');
  });

  it('exposes the popover state on a real button', () => {
    const html = render();
    expect(html).toMatch(/<button[^>]*type="button"[^>]*aria-expanded="false"/);
    // The count must never drift from the switches it describes.
    expect(html).toContain('>Kod<');
    expect(html).toContain('>Nama<');
  });
});
