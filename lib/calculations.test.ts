import { describe, expect, it } from 'vitest';
import {
  calculateAWU,
  calculateLevels,
  calculateOrderQty,
  determineStockStatus,
  roundToPackSize,
  statusColor,
  statusLabel,
} from './calculations';
import type { Settings, SKU } from './types';

function sku(overrides: Partial<SKU> = {}): SKU {
  return {
    id: 1,
    kod: 'TEST01',
    nama: 'Test SKU',
    saizPek: 1,
    groupId: null,
    enabled: true,
    fullStockAlways: false,
    notes: '',
    stokSemasa: 0,
    usageMonth1: 0,
    usageMonth2: 0,
    usageMonth3: 0,
    useManualLevels: false,
    minManual: 0,
    penimbalManual: 0,
    maksManual: 0,
    ...overrides,
  };
}

function settings(overrides: Partial<Settings> = {}): Settings {
  return {
    id: 3,
    minWeeks: 2,
    bufferWeeks: 4,
    maxWeeks: 6,
    defaultFilename: 'test',
    appTitle: 'Test',
    ...overrides,
  };
}

describe('calculateAWU', () => {
  it('averages three months and converts to weeks (÷ 4.33)', () => {
    // 43.3/month ÷ 4.33 weeks = exactly 10/week
    expect(calculateAWU(sku({ usageMonth1: 43.3, usageMonth2: 43.3, usageMonth3: 43.3 })))
      .toBeCloseTo(10, 5);
  });

  it('divides the total by 3 even when only one month has usage', () => {
    // 900 / 3 = 300/month, 300 / 4.33 = 69.28/week
    expect(calculateAWU(sku({ usageMonth1: 900 }))).toBeCloseTo(69.284, 3);
  });

  it('returns 0 when nothing is used', () => {
    expect(calculateAWU(sku())).toBe(0);
  });

  it('treats missing usage values as 0', () => {
    const broken = sku();
    delete (broken as Partial<SKU>).usageMonth1;
    expect(calculateAWU(broken)).toBe(0);
  });
});

describe('roundToPackSize', () => {
  it('rounds up to the next whole pack', () => {
    expect(roundToPackSize(11, 10)).toBe(20);
    expect(roundToPackSize(1, 10)).toBe(10);
    expect(roundToPackSize(5, 3)).toBe(6);
  });

  it('leaves exact multiples untouched', () => {
    expect(roundToPackSize(10, 10)).toBe(10);
    expect(roundToPackSize(0, 10)).toBe(0);
    expect(roundToPackSize(7, 1)).toBe(7);
  });

  it('returns the quantity unchanged when there is no pack size', () => {
    expect(roundToPackSize(11, 0)).toBe(11);
    expect(roundToPackSize(11, -5)).toBe(11);
    expect(roundToPackSize(11, NaN)).toBe(11);
  });
});

describe('calculateLevels (automatic levels)', () => {
  it('uses min/buffer/max weeks against AWU, rounded to the pack size', () => {
    const levels = calculateLevels(
      sku({ usageMonth1: 43.3, usageMonth2: 43.3, usageMonth3: 43.3, saizPek: 10 }),
      settings() // 2 / 4 / 6 weeks
    );
    expect(levels.awu).toBe(10);
    expect(levels.min).toBe(20); // 10 × 2
    expect(levels.penimbal).toBe(40); // 10 × 4
    expect(levels.maks).toBe(60); // 10 × 6
  });

  it('honours custom week settings', () => {
    const levels = calculateLevels(
      sku({ usageMonth1: 43.3, usageMonth2: 43.3, usageMonth3: 43.3, saizPek: 10 }),
      settings({ minWeeks: 3, bufferWeeks: 5, maxWeeks: 8 })
    );
    expect(levels.min).toBe(30);
    expect(levels.penimbal).toBe(50);
    expect(levels.maks).toBe(80);
  });

  it('rounds each level up to a whole pack', () => {
    // AWU 69.28 → 138.57 / 277.14 / 415.70 with pack size 10
    const levels = calculateLevels(
      sku({ usageMonth1: 900, saizPek: 10 }),
      settings()
    );
    expect(levels.awu).toBe(69);
    expect(levels.min).toBe(140);
    expect(levels.penimbal).toBe(280);
    expect(levels.maks).toBe(420);
  });

  it('falls back to the documented defaults when a setting is 0', () => {
    const levels = calculateLevels(
      sku({ usageMonth1: 43.3, usageMonth2: 43.3, usageMonth3: 43.3, saizPek: 10 }),
      settings({ minWeeks: 0, bufferWeeks: 0, maxWeeks: 0 })
    );
    expect(levels.min).toBe(20); // default 2 weeks
    expect(levels.penimbal).toBe(40); // default 4 weeks
    expect(levels.maks).toBe(60); // default 6 weeks
  });

  it('still reports AWU when usage is zero', () => {
    const levels = calculateLevels(sku({ saizPek: 10 }), settings());
    expect(levels).toEqual({ awu: 0, min: 0, penimbal: 0, maks: 0 });
  });
});

describe('calculateLevels (manual levels)', () => {
  it('uses the manual values, still rounded to the pack size', () => {
    const levels = calculateLevels(
      sku({
        useManualLevels: true,
        minManual: 15,
        penimbalManual: 40,
        maksManual: 33,
        saizPek: 10,
        usageMonth1: 43.3,
        usageMonth2: 43.3,
        usageMonth3: 43.3,
      }),
      settings()
    );
    expect(levels.awu).toBe(10); // still reported
    expect(levels.min).toBe(20); // 15 → 20
    expect(levels.penimbal).toBe(40);
    expect(levels.maks).toBe(40); // 33 → 40
  });

  it('leaves manual values alone when the pack size is 1', () => {
    const levels = calculateLevels(
      sku({
        useManualLevels: true,
        minManual: 15,
        penimbalManual: 40,
        maksManual: 33,
        saizPek: 1,
      }),
      settings({ minWeeks: 99, bufferWeeks: 99, maxWeeks: 99 })
    );
    expect(levels.min).toBe(15);
    expect(levels.penimbal).toBe(40);
    expect(levels.maks).toBe(33);
  });

  it('treats unset manual values as 0', () => {
    const levels = calculateLevels(sku({ useManualLevels: true, saizPek: 10 }), settings());
    expect(levels.min).toBe(0);
    expect(levels.penimbal).toBe(0);
    expect(levels.maks).toBe(0);
  });
});

describe('determineStockStatus', () => {
  // min 20, penimbal 40
  const levels = { awu: 10, min: 20, penimbal: 40, maks: 60 };

  it('reports disabled SKUs regardless of stock', () => {
    expect(determineStockStatus(sku({ enabled: false }), levels)).toBe('disabled');
    expect(determineStockStatus(sku({ enabled: false, stokSemasa: 500 }), levels)).toBe('disabled');
  });

  it('reports zero stock as out', () => {
    expect(determineStockStatus(sku({ stokSemasa: 0 }), levels)).toBe('out');
  });

  it('reports stock up to and including min as critical', () => {
    expect(determineStockStatus(sku({ stokSemasa: 1 }), levels)).toBe('critical');
    expect(determineStockStatus(sku({ stokSemasa: 20 }), levels)).toBe('critical');
  });

  it('reports stock between min and penimbal as low', () => {
    expect(determineStockStatus(sku({ stokSemasa: 21 }), levels)).toBe('low');
    expect(determineStockStatus(sku({ stokSemasa: 39 }), levels)).toBe('low');
  });

  it('reports stock AT penimbal as ok, not low', () => {
    // regression: commit 4b52b8c "stock at penimbal level now shows as OK"
    expect(determineStockStatus(sku({ stokSemasa: 40 }), levels)).toBe('ok');
    expect(determineStockStatus(sku({ stokSemasa: 1000 }), levels)).toBe('ok');
  });
});

describe('statusLabel / statusColor', () => {
  it('maps every status to a Malay label', () => {
    expect(statusLabel('ok')).toBe('OK');
    expect(statusLabel('low')).toBe('Rendah');
    expect(statusLabel('critical')).toBe('Kritikal');
    expect(statusLabel('out')).toBe('Kehabisan');
    expect(statusLabel('disabled')).toBe('Dinyahaktif');
  });

  it('falls back to the raw value for an unknown status', () => {
    expect(statusLabel('mystery' as never)).toBe('mystery');
  });

  it('maps statuses to badge colours', () => {
    expect(statusColor('ok')).toBe('green');
    expect(statusColor('low')).toBe('yellow');
    expect(statusColor('critical')).toBe('red');
    expect(statusColor('out')).toBe('gray');
    expect(statusColor('disabled')).toBe('gray');
    expect(statusColor('mystery' as never)).toBe('gray');
  });
});

describe('calculateOrderQty', () => {
  it('orders AWU × weeks minus what is already in stock', () => {
    // AWU 10 × 4 weeks = 40 needed
    const s = sku({ usageMonth1: 43.3, usageMonth2: 43.3, usageMonth3: 43.3, saizPek: 10 });
    expect(calculateOrderQty(s, 4)).toBe(40);
  });

  it('rounds a shortfall up to whole packs', () => {
    // 40 needed, 35 in stock → 5 short → one pack of 10
    const s = sku({
      usageMonth1: 43.3, usageMonth2: 43.3, usageMonth3: 43.3,
      saizPek: 10, stokSemasa: 35,
    });
    expect(calculateOrderQty(s, 4)).toBe(10);
  });

  it('orders nothing when stock already covers the period', () => {
    const base = { usageMonth1: 43.3, usageMonth2: 43.3, usageMonth3: 43.3, saizPek: 10 };
    expect(calculateOrderQty(sku({ ...base, stokSemasa: 40 }), 4)).toBe(0);
    expect(calculateOrderQty(sku({ ...base, stokSemasa: 400 }), 4)).toBe(0);
  });

  it('orders nothing for a zero-week period', () => {
    expect(calculateOrderQty(sku({ usageMonth1: 43.3, usageMonth2: 43.3, usageMonth3: 43.3 }), 0)).toBe(0);
  });

  it('keeps pack size 1 quantities exact', () => {
    const s = sku({
      usageMonth1: 43.3, usageMonth2: 43.3, usageMonth3: 43.3,
      saizPek: 1, stokSemasa: 37,
    });
    expect(calculateOrderQty(s, 4)).toBe(3); // 40 − 37
  });

  it('treats a missing pack size as 1 and missing stock as 0', () => {
    const s = sku({ usageMonth1: 43.3, usageMonth2: 43.3, usageMonth3: 43.3, saizPek: 0 });
    delete (s as Partial<SKU>).stokSemasa;
    expect(calculateOrderQty(s, 4)).toBe(40);
  });
});
