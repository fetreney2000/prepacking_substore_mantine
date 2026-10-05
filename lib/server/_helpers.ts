import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import type { ClientSession, Model } from 'mongoose';
import { getCounterModel } from './_schemas';

/**
 * Convert a Mongoose document (or lean object) into the API response shape:
 * `_id` becomes `id` and `__v` is dropped.
 */
export function formatDoc(doc: unknown): Record<string, unknown> | null {
  if (!doc) return null;
  const source = doc as { toObject?: () => Record<string, unknown> } & Record<string, unknown>;
  const obj: Record<string, unknown> = source.toObject ? source.toObject() : { ...source };
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  return obj;
}

/**
 * Reserve `count` consecutive integer ids for `model` in ONE atomic step and
 * return the first of them.
 *
 * The previous implementation read `max(_id)` and added 1, so two concurrent
 * serverless invocations could pick the same number and the loser failed with
 * a duplicate-key error. Ids now come from a `counters` document bumped with
 * a single `$inc`, which MongoDB applies atomically — so every caller gets a
 * distinct, consecutive range.
 *
 * The counter is seeded from the collection's real maximum the first time it
 * is used (and raised again after a JSON import via `setCounterFloor`), so
 * existing data keeps its ids and no generated id can already be taken.
 */
export async function reserveIds(model: Model<any>, count = 1): Promise<number> {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`reserveIds: kuantiti id tidak sah (${String(count)})`);
  }
  const Counter = getCounterModel();
  const key = model.modelName;

  const exists = await Counter.exists({ _id: key });
  if (!exists) {
    const last = await model.findOne().sort({ _id: -1 }).select('_id').lean();
    const seed = Math.max(0, Math.floor(Number((last as { _id?: number } | null)?._id) || 0));
    // $setOnInsert keeps a concurrent first-use from overwriting the seed.
    await Counter.updateOne({ _id: key }, { $setOnInsert: { seq: seed } }, { upsert: true });
  }

  const doc = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: count } },
    { new: true, upsert: true }
  ).lean();
  const seq = Number(doc?.seq);
  if (!Number.isInteger(seq) || seq < count) {
    throw new Error(`reserveIds: gagal menjana id untuk ${key}`);
  }
  return seq - count + 1;
}

/** Next single id for `model`. */
export async function getNextId(model: Model<any>): Promise<number> {
  return reserveIds(model, 1);
}

/**
 * Raise — never lower — a collection's counter to at least `minId`.
 *
 * JSON imports carry records with fixed ids, so without this the first create
 * after a restore would hand out an id that already exists. Runs inside the
 * import transaction so counters and data always agree.
 */
export async function setCounterFloor(
  model: Model<any>,
  minId: number,
  session?: ClientSession
): Promise<void> {
  const value = Math.floor(Number(minId));
  if (!Number.isFinite(value) || value <= 0) return;
  const Counter = getCounterModel();
  await Counter.updateOne(
    { _id: model.modelName },
    { $max: { seq: value } },
    { upsert: true, session }
  );
}

/**
 * Run every write in `fn` inside ONE MongoDB transaction: they commit
 * together or abort together, so a failure can't leave an order with no items
 * (or with half of them). Requires a replica set — Atlas qualifies; a
 * standalone `mongod` throws, which the caller logs and reports as a
 * request-id'd 500.
 *
 * Id allocation is deliberately kept *outside*: a rolled-back transaction
 * leaves an unused gap in the sequence, which is harmless.
 */
export async function withTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(() => fn(session));
  } finally {
    await session.endSession();
  }
}

/**
 * Map `kod` → SKU id for a batch of order items in ONE `$in` query, instead
 * of the previous `findOne` per item. Codes without a match simply stay out
 * of the map, so the caller leaves `skuId` null exactly as before.
 */
export async function resolveSkuIdsByKod(
  kods: Array<string | null | undefined>,
  SKU: Model<any>
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const needed = [...new Set(kods.filter((k): k is string => !!k))];
  if (!needed.length) return map;
  const found: any[] = await SKU.find({ kod: { $in: needed } }).select('_id kod').lean();
  for (const doc of found) map.set(String(doc.kod), Number(doc._id));
  return map;
}

/**
 * Parse a JSON request body.
 * Returns `{}` when there is no body at all, and `null` when the body is
 * present but malformed (callers should respond 400 in that case).
 */
export async function parseBody<T = Record<string, unknown>>(req: Request): Promise<T | null> {
  const text = await req.text();
  if (!text.trim()) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * Short id that ties a 500 response to the stack trace written to the server
 * logs. 8 hex chars: short enough for a user to read out, easy to grep.
 */
export function newRequestId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 8);
}

/**
 * Record the failure server-side (Vercel Logs, or the `next dev` terminal)
 * and return the id that was quoted to the client.
 */
export function logError(err: unknown): string {
  const requestId = newRequestId();
  if (err instanceof Error) {
    console.error(`[api ${requestId}] ${err.name}: ${err.message}\n${err.stack ?? ''}`);
  } else {
    console.error(`[api ${requestId}]`, err);
  }
  return requestId;
}

/**
 * Uniform 500 response.
 *
 * The underlying message is deliberately NOT forwarded to the client:
 * Mongoose/MongoDB errors can contain collection names, index names, query
 * shapes and connection details. The client only receives a request id, so an
 * operator can find the full error in the logs with a single grep. Messages
 * that are safe *and* actionable (validation failures, missing ids, duplicate
 * codes) go through `badRequest`/`notFound` instead — those are authored here,
 * not lifted from an exception.
 */
export function serverError(err: unknown): NextResponse {
  const requestId = logError(err);
  return NextResponse.json(
    { error: `Ralat pelayan. Sila cuba semula. (rujukan: ${requestId})`, requestId },
    { status: 500 }
  );
}

/** Uniform 400 response. */
export function badRequest(error: string): NextResponse {
  return NextResponse.json({ error }, { status: 400 });
}

/** Uniform 404 response. */
export function notFound(error: string): NextResponse {
  return NextResponse.json({ error }, { status: 404 });
}
