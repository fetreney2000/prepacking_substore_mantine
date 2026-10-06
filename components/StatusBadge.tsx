import { Badge } from '@mantine/core';
import { statusColor, statusLabel } from '@/lib/calculations';
import type { StockStatus } from '@/lib/types';

/**
 * Stock-status badge with a contrast-safe text colour in *both* colour
 * schemes (review items #1 and #10).
 *
 * Mantine's `variant="light"` renders the status colour as text on a tint of
 * the same colour: measured 1.75–3.01:1 in light mode. The first fix here used
 * a fixed dark ink — excellent in light (18.7–19.7:1) but catastrophic in
 * dark mode, where it collapses to 1.28–1.45:1 on dark tints.
 *
 * `--mantine-color-text` is scheme-aware (black in light, `#c9c9c9` in dark):
 *
 * | scheme | badge text | result   |
 * |--------|-----------:|----------|
 * | light  | 18.7–19.7:1 | ✅      |
 * | dark   |  6.9–7.8:1  | ✅      |
 *
 * both well past the 4.5:1 WCAG 1.4.3 requires. The tint stays because it
 * carries the hue and still separates the five statuses, and the label is
 * always rendered, so colour is never the only cue (1.4.1).
 */
export default function StatusBadge({ status }: { status: StockStatus }) {
  return (
    <Badge
      color={statusColor(status)}
      variant="light"
      styles={{ root: { color: 'var(--mantine-color-text)' } }}
    >
      {statusLabel(status)}
    </Badge>
  );
}
