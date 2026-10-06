import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import BrandIcon from './BrandIcon';

// createElement rather than JSX: same convention as StatusBadge.test.
const render = (size?: number) =>
  renderToStaticMarkup(createElement(BrandIcon, size === undefined ? {} : { size }));

describe('BrandIcon', () => {
  it('renders the brand artwork (gradient tile, teal lid, white box, cross)', () => {
    const html = render();
    expect(html).toContain('viewBox="0 0 32 32"');
    expect(html).toContain('url(#brandG)');
    expect(html).toContain('#12B886'); // lid
    expect(html).toContain('#FFFFFF'); // box body
    expect(html).toContain('#1E3A8A'); // cross
    expect(html).toContain('M14.1 14.6h3.8'); // the cross path
  });

  it('is decorative: it always sits beside the app name, so it is hidden from AT', () => {
    expect(render()).toContain('aria-hidden="true"');
    expect(render()).not.toContain('aria-label');
  });

  it('accepts a size (header 24, sign-in card larger)', () => {
    expect(render(24)).toContain('width="24"');
    expect(render(40)).toContain('width="40"');
  });

  it('the favicon asset mirrors the component artwork', () => {
    // app/icon.svg ships to the browser tab; if it drifts from BrandIcon the
    // tab and the header would show two different logos.
    const svg = readFileSync('app/icon.svg', 'utf8');
    expect(svg).toContain('viewBox="0 0 32 32"');
    expect(svg).toContain('#12B886');
    expect(svg).toContain('#1E3A8A');
    expect(svg).toContain('M14.1 14.6h3.8');
    expect(svg).toContain('rx="7.5"');
  });
});
