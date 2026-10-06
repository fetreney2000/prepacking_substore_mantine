import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { renderToStaticMarkup } from 'react-dom/server';
import DashboardPage from './page';

// The dashboard must paint its structure (title, summary cards, table frame)
// on first render instead of a blank screen with a spinner (review #6): on
// the server, and therefore in the streamed HTML, `loading` is still true.
describe('DashboardPage', () => {
  it('renders the skeleton page while loading', () => {
    const html = renderToStaticMarkup(
      createElement(MantineProvider, null, createElement(DashboardPage))
    );
    expect(html).toContain('Papan Pemuka');
    expect(html).toContain('mantine-Skeleton-root');
    expect(html).toContain('table-scroll');
    expect(html).not.toContain('Loader');
  });
});
