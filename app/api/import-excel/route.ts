import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/server/_db';
import { getSKUModel } from '@/lib/server/_schemas';
import { badRequest, serverError } from '@/lib/server/_helpers';
import type { ExcelSkip } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type SkuRow = Record<string, any>;

/**
 * First defined, non-blank value among `keys`. (`||` would treat a legitimate
 * `0` as missing and fall through to the next column.)
 */
function pick(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

/**
 * Read a stock quantity from an Excel cell. Returns `null` when the cell is
 * not a number.
 *
 * The previous `parseInt(String(x)) || 0` turned `"1,000"`, `"N/A"`, `""`
 * and dates into `0` — and then *wrote* that zero to `stokSemasa`, so a
 * renamed or reformatted column could reset stock across the board while
 * reporting success. Such rows are now skipped and reported instead.
 *
 * Thousands separators are stripped (`1,000` / `1 000`); the integer part is
 * kept, matching what `parseInt` did for values it could parse.
 */
function parseQuantity(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.trunc(value) : null;
  }
  if (typeof value === 'boolean') return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const cleaned = raw.replace(/[\s\u00a0,]/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function text(value: unknown): string {
  return value === undefined || value === null ? '' : String(value).trim();
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const SKU = getSKUModel();
    const body = await req.json().catch(() => null);
    if (body === null || typeof body !== 'object') {
      return badRequest('Format JSON tidak sah');
    }
    const { filename, rows } = body as { filename?: string; rows?: unknown };
    if (!rows || !Array.isArray(rows)) {
      return badRequest('Data baris tidak sah');
    }

    const allSkus: SkuRow[] = await SKU.find().lean();
    const normalizeStr = (s: unknown) => (s || '').toString().trim().toUpperCase();

    // One pass over the SKUs builds both lookups — the old code scanned the
    // whole list per Excel row (O(rows × skus)). `null` marks a key shared by
    // several SKUs: such rows are never matched blindly, because picking the
    // first hit can write stock against the wrong item (review #9).
    const byKod = new Map<string, SkuRow | null>();
    const byNama = new Map<string, SkuRow | null>();
    for (const sku of allSkus) {
      const kod = normalizeStr(sku.kod);
      byKod.set(kod, byKod.has(kod) ? null : sku);
      const nama = normalizeStr(sku.nama);
      byNama.set(nama, byNama.has(nama) ? null : sku);
    }

    const presentInExcel = new Set<string>();
    const updated: Array<{ kod: string; nama: string; oldQty: number; newQty: number }> = [];
    const skipped: ExcelSkip[] = [];
    const pending: Array<{ id: unknown; qty: number }> = [];
    let notFoundInAppCount = 0;

    const skip = (index: number, row: Record<string, unknown>, reason: string) => {
      skipped.push({
        // +1 for0-based indexing, +1 for the header row.
        row: index + 2,
        kod: text(pick(row, 'Drug / Non Drug Code', 'code')),
        nama: text(pick(row, 'Drug / Non Drug Description', 'description')),
        reason,
      });
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || typeof row !== 'object') {
        skip(i, {}, 'Baris bukan objek');
        continue;
      }
      const record = row as Record<string, unknown>;

      const codeCol = pick(record, 'Drug / Non Drug Code', 'code');
      const descCol = pick(record, 'Drug / Non Drug Description', 'description');
      const qtyCol = pick(record, 'Quantity Available', 'quantity');
      const normCode = normalizeStr(codeCol);
      const normDesc = normalizeStr(descCol);

      // Code first (as before), then description — but only unambiguously.
      // A unique description match may still resolve an ambiguous code.
      let sku: SkuRow | null = null;
      let ambiguous = false;
      if (normCode && byKod.has(normCode)) {
        const hit = byKod.get(normCode) ?? null;
        if (hit) sku = hit;
        else ambiguous = true;
      }
      if (!sku && normDesc && byNama.has(normDesc)) {
        const hit = byNama.get(normDesc) ?? null;
        if (hit) sku = hit;
        else ambiguous = true;
      }

      if (!sku) {
        if (ambiguous) {
          skip(i, record, 'Padanan tidak jelas (lebih satu SKU berkongsi kod/nama yang sama)');
        } else if (!normCode && !normDesc) {
          skip(i, record, 'Baris tanpa kod mahupun nama');
        } else {
          skip(i, record, 'Tiada SKU sepadan dalam aplikasi');
          notFoundInAppCount++;
        }
        continue;
      }

      // The SKU is listed in this sheet even if we end up refusing its value,
      // so it must not be reported as "missing from Excel".
      presentInExcel.add(String(sku._id));

      const qty = parseQuantity(qtyCol);
      if (qty === null) {
        skip(i, record, `Kuantiti tidak sah: "${text(qtyCol).slice(0, 40)}"`);
        continue;
      }

      const oldQty = sku.stokSemasa || 0;
      if (oldQty !== qty) {
        pending.push({ id: sku._id, qty });
        updated.push({ kod: sku.kod, nama: sku.nama, oldQty, newQty: qty });
      }
    }

    // One bulk write for the whole sheet instead of one round trip per row.
    if (pending.length) {
      await SKU.bulkWrite(
        pending.map((u) => ({
          updateOne: { filter: { _id: u.id }, update: { $set: { stokSemasa: u.qty } } },
        })),
        { ordered: false }
      );
    }

    const missingFromExcel = allSkus
      .filter((s) => !presentInExcel.has(String(s._id)))
      .map((s) => ({ kod: s.kod, nama: s.nama, stokSemasa: s.stokSemasa || 0 }));

    return NextResponse.json({
      success: true,
      filename: filename || 'unknown',
      updated,
      updatedCount: updated.length,
      missingFromExcel,
      missingFromExcelCount: missingFromExcel.length,
      notFoundInAppCount,
      skipped,
      skippedCount: skipped.length,
    });
  } catch (err) {
    return serverError(err);
  }
}
