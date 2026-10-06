import { Box, Paper, Skeleton, Table } from '@mantine/core';

/**
 * Placeholder cells shaped like the data they replace (review item #6).
 *
 * A centered spinner hides the page behind a blank screen; skeletons keep the
 * table frame visible and shimmer where the values will land, so the layout
 * does not jump when the data arrives.
 */

/** Rows of placeholder cells — drops inside an existing `<Table.Tbody>`. */
export function SkeletonRows({
  rows = 6,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <Table.Tr key={r}>
          {Array.from({ length: columns }, (_, c) => (
            <Table.Td key={c}>
              <Skeleton height={12} radius="sm" />
            </Table.Td>
          ))}
        </Table.Tr>
      ))}
    </>
  );
}

/**
 * A whole placeholder table (header + rows) for pages that return early while
 * loading. Wrap it in the page's usual Stack/Title so the header appears at
 * the same moment it eventually will with data.
 */
export default function TableSkeleton({
  rows = 6,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <Paper withBorder p="md">
      {/* Same wrapper the real tables use, so the loading state and the loaded
          table share one layout (sticky header rules, print rules — §7). */}
      <Box className="table-scroll">
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              {Array.from({ length: columns }, (_, c) => (
                <Table.Th key={c}>
                  <Skeleton height={10} />
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <SkeletonRows rows={rows} columns={columns} />
          </Table.Tbody>
        </Table>
      </Box>
    </Paper>
  );
}
