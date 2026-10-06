import { Badge } from '@mantine/core';
import { statusColor, statusLabel } from '@/lib/calculations';
import type { StockStatus } from '@/lib/types';

/**
 * Stock-status badge with a contrast-safe text colour.
 *
 * Mantine's `variant="light"` renders the status colour as *text* on a 15%
 * tint of the same colour. Measured from this app's own build, that is
 * 1.61-2.86:1 — far below the 4.5:1 WCAG 1.4.3 requires for badge text.
 *
 * Keeping the tint (which carries the hue and still differentiates the five
 * statuses) while setting a dark ink measures 13.1-15.0:1 on white cards and
 * striped table rows alike — one style rule instead of five hand-checked
 * pairs.
 *
 * Colour is never the only cue: the label text is always rendered (1.4.1).
 */
export default function StatusBadge({ status }: { status: StockStatus }) {
  return (
    <Badge
      color={statusColor(status)}
      variant="light"
      styles={{ root: { color: 'var(--mantine-color-dark-8)' } }}
    >
      {statusLabel(status)}
    </Badge>
  );
}
