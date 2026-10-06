import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { renderToStaticMarkup } from 'react-dom/server';
import StatusBadge from './StatusBadge';

type Status = Parameters<typeof StatusBadge>[0]['status'];

// createElement rather than JSX: keeps the test runnable without a JSX
// transform configuration of its own.
const render = (status: Status) =>
  renderToStaticMarkup(
    createElement(
      MantineProvider,
      null,
      createElement(StatusBadge, { status })
    )
  );

const ALL: Status[] = ['ok', 'low', 'critical', 'out', 'disabled'];

describe('StatusBadge', () => {
  it('always renders the status label, so colour is never the only cue', () => {
    expect(render('ok')).toContain('>OK<');
    expect(render('low')).toContain('>Rendah<');
    expect(render('critical')).toContain('>Kritikal<');
    expect(render('out')).toContain('>Kehabisan<');
    expect(render('disabled')).toContain('>Dinyahaktif<');
  });

  it('overrides the light-variant text with the measured dark ink', () => {
    // variant="light" declares --badge-color: ...-light-color (1.61-2.86:1,
    // fails WCAG 1.4.3). Our override must be inline on the root, because the
    // root's class rule sets color: var(--badge-color) and inline beats class.
    for (const status of ALL) {
      expect(render(status)).toMatch(/style="color:var\(--mantine-color-dark-8\)/);
    }
  });

  it('keeps the status hue as the tinted background', () => {
    expect(render('ok')).toContain('--badge-bg:var(--mantine-color-green-light)');
    expect(render('low')).toContain('--badge-bg:var(--mantine-color-yellow-light)');
    expect(render('critical')).toContain('--badge-bg:var(--mantine-color-red-light)');
    expect(render('out')).toContain('--badge-bg:var(--mantine-color-gray-light)');
    expect(render('disabled')).toContain('--badge-bg:var(--mantine-color-gray-light)');
  });
});
