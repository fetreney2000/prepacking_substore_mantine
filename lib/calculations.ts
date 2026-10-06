import { SKU, Settings, StockLevels, StockStatus } from './types';

export function calculateAWU(sku: SKU): number {
  const total = (sku.usageMonth1 || 0) + (sku.usageMonth2 || 0) + (sku.usageMonth3 || 0);
  return total / 3 / 4.33;
}

export function roundToPackSize(qty: number, packSize: number): number {
  if (!packSize || packSize <= 0) return qty;
  return Math.ceil(qty / packSize) * packSize;
}

export function calculateLevels(sku: SKU, settings: Settings): StockLevels {
  const awu = calculateAWU(sku);
  let min: number, penimbal: number, maks: number;
  if (sku.useManualLevels) {
    min = sku.minManual || 0;
    penimbal = sku.penimbalManual || 0;
    maks = sku.maksManual || 0;
  } else {
    min = awu * (settings.minWeeks || 2);
    penimbal = awu * (settings.bufferWeeks || 4);
    maks = awu * (settings.maxWeeks || 6);
  }
  return {
    awu: Math.round(awu),
    min: roundToPackSize(min, sku.saizPek),
    penimbal: roundToPackSize(penimbal, sku.saizPek),
    maks: roundToPackSize(maks, sku.saizPek),
  };
}

export function determineStockStatus(sku: SKU, levels: StockLevels): StockStatus {
  if (!sku.enabled) return 'disabled';
  const stok = sku.stokSemasa || 0;
  if (stok === 0) return 'out';
  if (stok <= levels.min) return 'critical';
  if (stok < levels.penimbal) return 'low';
  return 'ok';
}

/**
 * Single source of truth for how a stock status looks (review item #8):
 * the label shown everywhere, the Mantine colour behind the tinted badge, and
 * the background used when the same status is printed on paper. StatusBadge
 * and the report printer both read from here, so screen and paper cannot drift.
 */
export interface StockStatusMeta {
  label: string;
  color: string;
  printBg: string;
}

export const STOCK_STATUS: Record<StockStatus, StockStatusMeta> = {
  ok: { label: 'OK', color: 'green', printBg: '#dcfce7' },
  low: { label: 'Rendah', color: 'yellow', printBg: '#fef9c3' },
  critical: { label: 'Kritikal', color: 'red', printBg: '#fee2e2' },
  out: { label: 'Kehabisan', color: 'gray', printBg: '#f3f4f6' },
  disabled: { label: 'Dinyahaktif', color: 'gray', printBg: '#f3f4f6' },
};

export function statusLabel(status: StockStatus): string {
  return STOCK_STATUS[status]?.label ?? status;
}

export function statusColor(status: StockStatus): string {
  return STOCK_STATUS[status]?.color ?? 'gray';
}

export function calculateOrderQty(sku: SKU, tempohMinggu: number): number {
  const awu = calculateAWU(sku);
  const needed = awu * tempohMinggu - (sku.stokSemasa || 0);
  if (needed <= 0) return 0;
  return roundToPackSize(needed, sku.saizPek || 1);
}
