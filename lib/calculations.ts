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

export function statusLabel(status: StockStatus): string {
  const map: Record<StockStatus, string> = {
    ok: 'OK',
    low: 'Rendah',
    critical: 'Kritikal',
    out: 'Kehabisan',
    disabled: 'Dinyahaktif',
  };
  return map[status] || status;
}

export function statusColor(status: StockStatus): string {
  const map: Record<StockStatus, string> = {
    ok: 'green',
    low: 'yellow',
    critical: 'red',
    out: 'gray',
    disabled: 'gray',
  };
  return map[status] || 'gray';
}

export function calculateOrderQty(sku: SKU, tempohMinggu: number): number {
  const awu = calculateAWU(sku);
  const needed = awu * tempohMinggu - (sku.stokSemasa || 0);
  if (needed <= 0) return 0;
  return roundToPackSize(needed, sku.saizPek || 1);
}
