import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { renderToStaticMarkup } from 'react-dom/server';
import ColorSchemeToggle from './ColorSchemeToggle';

// createElement rather than JSX: same convention as StatusBadge.test.
const render = () =>
  renderToStaticMarkup(
    createElement(MantineProvider, null, createElement(ColorSchemeToggle))
  );

describe('ColorSchemeToggle', () => {
  it('is a real button with an accessible name naming the target scheme', () => {
    const html = render();
    // Server markup resolves to the light scheme, so the button offers dark.
    expect(html).toMatch(/<button[^>]*aria-label="Tukar ke mod gelap"/);
    expect(html).toContain('type="button"');
  });

  it('shows the icon of the scheme the click switches to, not away from', () => {
    const html = render();
    // Light page -> moon (switch to dark). The sun appears only when the
    // computed scheme is dark, which happens after hydration.
    expect(html).toContain('moon');
    expect(html).not.toContain('sun');
  });

  it('uses a pastel that holds contrast on the blue header gradient', () => {
    const html = render();
    // Server state is light -> offers the dark scheme with the violet moon.
    expect(html).toContain('var(--mantine-color-violet-2)');
    expect(html).not.toContain('color:white');
  });
});
