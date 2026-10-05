import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/server/_db';
import {
  getSettingModel,
  getGroupModel,
  getSKUModel,
  getOrderModel,
  getOrderItemModel,
} from '@/lib/server/_schemas';
import {
  IMPORT_FIELDS,
  ImportValidationError,
  prepareImport,
  validateWithModels,
} from '@/lib/server/_import';
import { badRequest, logError, parseBody, setCounterFloor, withTransaction } from '@/lib/server/_helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Replaces the entire database with an uploaded export.
 *
 * Safety properties (previously: delete everything, then hope the inserts work):
 *  1. The payload is fully validated *before* any write — bad input → 400,
 *     database untouched.
 *  2. All deletes and inserts run inside ONE MongoDB transaction, so the
 *     import is all-or-nothing: a mid-way failure rolls back to the data
 *     that was there before, instead of leaving empty collections.
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await parseBody(req);
    if (payload === null) return badRequest('Format JSON tidak sah.');

    await dbConnect();
    const models = {
      settings: getSettingModel(),
      groups: getGroupModel(),
      skus: getSKUModel(),
      orders: getOrderModel(),
      orderItems: getOrderItemModel(),
    };

    // 1. Validate everything up front (envelope, ids, duplicates, field types).
    const { docs, counts } = prepareImport(payload);
    await validateWithModels(docs, models);

    // 2. Atomic swap.
    await withTransaction(async (session) => {
      // Sequential on purpose: a transaction session must not run
      // concurrent operations.
      await models.settings.deleteMany({}, { session });
      await models.groups.deleteMany({}, { session });
      await models.skus.deleteMany({}, { session });
      await models.orders.deleteMany({}, { session });
      await models.orderItems.deleteMany({}, { session });

      if (counts.settings) await models.settings.insertMany(docs.settings, { session });
      if (counts.groups) await models.groups.insertMany(docs.groups, { session });
      if (counts.skus) await models.skus.insertMany(docs.skus, { session });
      if (counts.orders) await models.orders.insertMany(docs.orders, { session });
      if (counts.orderItems) await models.orderItems.insertMany(docs.orderItems, { session });

      // Imported records carry fixed ids, so every counter must sit at or
      // above the highest one — otherwise the first create after a restore
      // would collide with an existing record. `$max` never lowers a
      // counter, so gaps left by earlier allocations stay harmless.
      for (const field of IMPORT_FIELDS) {
        const maxId = docs[field].reduce((max, d) => Math.max(max, Number(d._id) || 0), 0);
        await setCounterFloor(models[field], maxId, session);
      }
    });

    return NextResponse.json({ success: true, counts });
  } catch (err) {
    // Payload problems are authored by us and name the exact record — safe
    // and actionable, so they still reach the client as a 400.
    if (err instanceof ImportValidationError) return badRequest(err.message);

    const detail = err instanceof Error ? err.message : '';
    const requestId = logError(err);
    // Standalone mongod (no replica set) cannot run transactions at all.
    if (/Transaction numbers are only allowed|replica set|mongos/i.test(detail)) {
      return NextResponse.json(
        {
          error:
            'Import selamat memerlukan MongoDB replica set (cth. Atlas). ' +
            'Tiada sebarang perubahan disimpan.',
          requestId,
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: `Import gagal — tiada sebarang perubahan disimpan. (rujukan: ${requestId})`,
        requestId,
      },
      { status: 500 }
    );
  }
}
