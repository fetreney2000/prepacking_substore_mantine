import { describe, expect, it } from 'vitest';
import { IMPORT_FIELDS, ImportValidationError, prepareImport } from './_import';

const empty = () => ({
  settings: [] as unknown[],
  groups: [] as unknown[],
  skus: [] as unknown[],
  orders: [] as unknown[],
  orderItems: [] as unknown[],
});

const expectError = (fn: () => unknown, pattern: RegExp) => {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(ImportValidationError);
    expect((err as Error).message).toMatch(pattern);
    return;
  }
  throw new Error('expected prepareImport to throw');
};

describe('prepareImport — envelope', () => {
  it('accepts an empty-but-complete payload', () => {
    const { docs, counts } = prepareImport(empty());
    expect(counts).toEqual({ settings: 0, groups: 0, skus: 0, orders: 0, orderItems: 0 });
    expect(docs.orderItems).toEqual([]);
  });

  it('rejects a non-object payload', () => {
    expectError(() => prepareImport(null), /Format JSON tidak sah/);
    expectError(() => prepareImport([]), /Format JSON tidak sah/);
    expectError(() => prepareImport('nope'), /Format JSON tidak sah/);
  });

  it('names the collection that is missing or not an array', () => {
    const broken = { ...empty(), skus: undefined };
    expectError(() => prepareImport(broken), /'skus' tiada atau bukan array/);
    expectError(() => prepareImport({ ...empty(), skus: {} }), /'skus' tiada atau bukan array/);
  });

  it('exports the five collection names', () => {
    expect(IMPORT_FIELDS).toEqual(['settings', 'groups', 'skus', 'orders', 'orderItems']);
  });
});

describe('prepareImport — records', () => {
  it('moves id to _id and drops id/__v', () => {
    const { docs, counts } = prepareImport({
      ...empty(),
      groups: [{ id: 7, name: 'Kumpulan A', notes: 'x', __v: 0 }],
    });
    expect(docs.groups).toEqual([{ _id: 7, name: 'Kumpulan A', notes: 'x' }]);
    expect(counts.groups).toBe(1);
  });

  it('rejects a record without an id, naming the exact record', () => {
    expectError(
      () => prepareImport({ ...empty(), skus: [{ id: 1, kod: 'ok' }, { kod: 'no-id' }] }),
      /skus\[1\] tiada medan 'id'/
    );
  });

  it('rejects a non-numeric id', () => {
    expectError(() => prepareImport({ ...empty(), skus: [{ id: '5', kod: 'x' }] }),
      /skus\[0\] tiada medan 'id'/);
    expectError(() => prepareImport({ ...empty(), skus: [{ kod: 'x' }] }),
      /skus\[0\] tiada medan 'id'/);
  });

  it('rejects a non-object record', () => {
    expectError(() => prepareImport({ ...empty(), skus: ['not-an-object'] }),
      /skus\[0\] mesti berupa objek/);
  });

  it('rejects duplicate ids inside a collection', () => {
    expectError(
      () => prepareImport({ ...empty(), skus: [{ id: 3, kod: 'a' }, { id: 3, kod: 'b' }] }),
      /skus mengandungi 'id' berulang: 3/
    );
  });

  it('rejects duplicate kod in skus (the unique index would reject it later)', () => {
    expectError(
      () => prepareImport({ ...empty(), skus: [{ id: 1, kod: 'DUP', nama: 'a' }, { id: 2, kod: 'DUP', nama: 'b' }] }),
      /skus mengandungi 'kod' berulang: DUP/
    );
  });

  it('allows the same id in different collections', () => {
    const { counts } = prepareImport({
      ...empty(),
      skus: [{ id: 1, kod: 'a', nama: 'A' }],
      orders: [{ id: 1, tarikh: '2026-01-01', namaPembuat: 'x' }],
    });
    expect(counts).toMatchObject({ skus: 1, orders: 1 });
  });
});

describe('prepareImport — order item linking', () => {
  const payload = () => ({
    ...empty(),
    skus: [
      { id: 5, kod: 'A1', nama: 'Alpha' },
      { id: 6, kod: 'B1', nama: 'Beta' },
    ],
    orderItems: [
      { id: 101, orderId: 1, skuId: null, kod: 'A1', qtyOrdered: 5, notes: '' },
      { id: 102, orderId: 1, skuId: null, kod: 'ZZZ-UNKNOWN', qtyOrdered: 5, notes: '' },
      { id: 103, orderId: 1, skuId: 77, kod: 'B1', qtyOrdered: 5, notes: '' },
      { id: 104, orderId: 1, skuId: null, kod: '', qtyOrdered: 5, notes: '' },
    ],
  });

  it('links null-skuId items to the SKU with the same kod', () => {
    const { docs } = prepareImport(payload());
    expect(docs.orderItems.find((i) => i._id === 101)?.skuId).toBe(5);
  });

  it('leaves items whose kod matches nothing as null', () => {
    const { docs } = prepareImport(payload());
    expect(docs.orderItems.find((i) => i._id === 102)?.skuId).toBeNull();
    expect(docs.orderItems.find((i) => i._id === 104)?.skuId).toBeNull();
  });

  it('never overwrites an explicit skuId', () => {
    const { docs } = prepareImport(payload());
    expect(docs.orderItems.find((i) => i._id === 103)?.skuId).toBe(77);
  });

  it('does not mutate the caller payload', () => {
    const input = payload();
    prepareImport(input);
    expect(input.orderItems[0].skuId).toBeNull();
  });
});
