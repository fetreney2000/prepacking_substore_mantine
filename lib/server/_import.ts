/**
 * Validation and preparation for the destructive JSON import.
 *
 * Everything here is pure and runs BEFORE any database write: if
 * `prepareImport` / `validateWithModels` throws, the database has not been
 * touched at all. The delete + insert afterwards happens inside a single
 * MongoDB transaction (see `app/api/import/route.ts`), so a failure at that
 * stage rolls back instead of leaving the collections empty.
 */
import type { Model } from 'mongoose';

/** Thrown for payload problems the user can fix — the route maps it to a 400. */
export class ImportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportValidationError';
  }
}

export const IMPORT_FIELDS = ['settings', 'groups', 'skus', 'orders', 'orderItems'] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];
export type ImportDocs = Record<ImportField, Array<Record<string, unknown>>>;
export type ImportCounts = Record<ImportField, number>;

function message(err: unknown): string {
  const text = err instanceof Error ? err.message : String(err);
  return text.length > 400 ? `${text.slice(0, 400)}…` : text;
}

function readArray(payload: Record<string, unknown>, field: string): unknown[] {
  const value = payload[field];
  if (!Array.isArray(value)) {
    throw new ImportValidationError(`Medan '${field}' tiada atau bukan array.`);
  }
  return value;
}

function readId(entry: unknown, label: string): number {
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new ImportValidationError(`${label} mesti berupa objek.`);
  }
  const id = (entry as Record<string, unknown>).id;
  if (typeof id !== 'number' || !Number.isFinite(id)) {
    throw new ImportValidationError(
      `${label} tiada medan 'id' (nombor). Semak fail — setiap rekod mesti kekal id asalnya.`
    );
  }
  return id;
}

/** `_id` ← `id`, drop `id` and `__v`. Mirrors the previous importer exactly. */
function toDoc(entry: Record<string, unknown>, id: number): Record<string, unknown> {
  const { id: _ignored, ...rest } = entry;
  const doc: Record<string, unknown> = { _id: id, ...rest };
  delete doc.__v;
  return doc;
}

function assertUniqueIds(docs: Array<Record<string, unknown>>, field: string): void {
  const seen = new Set<unknown>();
  for (const doc of docs) {
    if (seen.has(doc._id)) {
      throw new ImportValidationError(`${field} mengandungi 'id' berulang: ${String(doc._id)}.`);
    }
    seen.add(doc._id);
  }
}

/**
 * Re-link order items whose `skuId` is null to the SKU with the same `kod`.
 * The previous importer did this with one UPDATE per row *after* the wipe;
 * doing it in memory keeps the transaction down to a single insert per
 * collection and produces the same result (SKU `kod` has a unique index, so
 * the match is unambiguous).
 */
function linkOrphanItems(
  items: Array<Record<string, unknown>>,
  skus: Array<Record<string, unknown>>
): void {
  const skuIdByKod = new Map<string, number>();
  for (const sku of skus) {
    if (typeof sku.kod === 'string') skuIdByKod.set(sku.kod, sku._id as number);
  }
  for (const item of items) {
    if (item.skuId !== null && item.skuId !== undefined) continue;
    if (item.kod === null || item.kod === undefined || item.kod === '') continue;
    const skuId = skuIdByKod.get(String(item.kod));
    if (skuId !== undefined) item.skuId = skuId;
  }
}

export interface PreparedImport {
  docs: ImportDocs;
  counts: ImportCounts;
}

/**
 * Check the envelope and every record, then return documents ready to insert.
 * Throws `ImportValidationError` — always with a message naming the exact
 * record that is wrong — without performing any database operation.
 */
export function prepareImport(payload: unknown): PreparedImport {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ImportValidationError('Format JSON tidak sah.');
  }
  const data = payload as Record<string, unknown>;

  const docs = {} as ImportDocs;
  for (const field of IMPORT_FIELDS) {
    const entries = readArray(data, field);
    docs[field] = entries.map((entry, index) => {
      const label = `${field}[${index}]`;
      const id = readId(entry, label);
      return toDoc(entry as Record<string, unknown>, id);
    });
    assertUniqueIds(docs[field], field);
  }

  // `kod` has a unique index in the database; catch duplicates here so they
  // surface as a 400 instead of an insert failure inside the transaction.
  const seenKod = new Set<string>();
  for (const sku of docs.skus) {
    if (typeof sku.kod !== 'string') continue;
    if (seenKod.has(sku.kod)) {
      throw new ImportValidationError(`skus mengandungi 'kod' berulang: ${sku.kod}.`);
    }
    seenKod.add(sku.kod);
  }

  linkOrphanItems(docs.orderItems, docs.skus);

  const counts = {} as ImportCounts;
  for (const field of IMPORT_FIELDS) counts[field] = docs[field].length;
  return { docs, counts };
}

/**
 * Run Mongoose's own casting + schema validation on every record so problems
 * (wrong types, missing required fields) are reported as a 400 naming the
 * record — instead of failing mid-transaction.
 */
export async function validateWithModels(
  docs: ImportDocs,
  models: Record<ImportField, Model<any>>
): Promise<void> {
  for (const field of IMPORT_FIELDS) {
    const model = models[field];
    const list = docs[field];
    for (let i = 0; i < list.length; i++) {
      try {
        await new model(list[i]).validate();
      } catch (err) {
        throw new ImportValidationError(`${field}[${i}] tidak sah: ${message(err)}`);
      }
    }
  }
}
