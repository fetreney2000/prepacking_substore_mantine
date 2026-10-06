import { createElement, type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { MantineProvider, Table } from '@mantine/core';
import { renderToStaticMarkup } from 'react-dom/server';
import TableSkeleton, { SkeletonRows } from './Skeletons';

// createElement rather than JSX: same convention as StatusBadge.test.
const render = (node: ReactElement) =>
  renderToStaticMarkup(createElement(MantineProvider, null, node));

const count = (html: string, tag: string) => html.match(new RegExp('<' + tag + '(?=[\\s>])', 'g'))?.length ?? 0;

describe('TableSkeleton', () => {
  it('renders one header row plus the requested body rows and columns', () => {
    const html = render(createElement(TableSkeleton, { rows: 4, columns: 3 }));
    expect(count(html, 'tr')).toBe(5); // 1 header + 4 body
    expect(count(html, 'th')).toBe(3);
    expect(count(html, 'td')).toBe(12); // 4 rows x 3 cells
    // 15 placeholders + the Paper wrapper + the .table-scroll box
    expect(count(html, 'div')).toBe(17);
    expect(html).toContain('class="table-scroll"');
  });

  it('marks placeholders as animated, so a reduced-motion rule can switch them off', () => {
    const html = render(createElement(TableSkeleton, { rows: 2, columns: 2 }));
    expect(html.match(/data-animate="true"/g)?.length).toBe(6); // 4 cells + 2 header
  });

  it('defaults to a table the size of the real ones (6 rows x 5 columns)', () => {
    const html = render(createElement(TableSkeleton, null));
    expect(count(html, 'tr')).toBe(7);
    expect(count(html, 'td')).toBe(30);
  });
});

describe('SkeletonRows', () => {
  // Table.Tr/Td read the Table context, so the rows are always rendered the
  // way the pages use them: inside a <Table>.
  const renderRows = (rows: number, columns: number) =>
    render(
      createElement(
        Table,
        null,
        createElement(
          'tbody',
          null,
          createElement(SkeletonRows, { rows, columns })
        )
      )
    );

  it('renders only body rows, so it drops into an existing table', () => {
    const html = renderRows(3, 4);
    expect(count(html, 'tr')).toBe(3);
    expect(count(html, 'td')).toBe(12);
    expect(count(html, 'th')).toBe(0);
    expect(count(html, 'thead')).toBe(0);
  });

  it('renders nothing when asked for zero rows', () => {
    const html = renderRows(0, 4);
    expect(count(html, 'tr')).toBe(0);
    expect(count(html, 'td')).toBe(0);
  });
});
