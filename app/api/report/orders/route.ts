import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/server/_db';
import { getOrderModel, getOrderItemModel } from '@/lib/server/_schemas';
import { badRequest, formatDoc, serverError } from '@/lib/server/_helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Orders with their line items embedded, in two queries total — the report
 * page used to fetch items one order at a time over HTTP.
 *
 * `tarikh` is stored as `YYYY-MM-DD`, so a string range comparison is
 * chronological and matches what the client did before.
 */
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const Order = getOrderModel();
    const OrderItem = getOrderItemModel();

    const from = req.nextUrl.searchParams.get('from');
    const to = req.nextUrl.searchParams.get('to');
    if ((from && !DATE.test(from)) || (to && !DATE.test(to))) {
      return badRequest('Tarikh tidak sah (format YYYY-MM-DD)');
    }

    const range: Record<string, string> = {};
    if (from) range.$gte = from;
    if (to) range.$lte = to;
    const filter: Record<string, unknown> = Object.keys(range).length ? { tarikh: range } : {};

    const orders = await Order.find(filter).sort({ tarikh: -1 }).lean();
    const ids: number[] = orders.map((o: { _id: number }) => Number(o._id));
    const items: any[] = ids.length
      ? await OrderItem.find({ orderId: { $in: ids } }).sort({ _id: 1 }).lean()
      : [];

    const itemsByOrder = new Map<number, Array<Record<string, unknown>>>();
    for (const item of items) {
      const doc = formatDoc(item)!;
      const orderId = Number(doc.orderId);
      const bucket = itemsByOrder.get(orderId);
      if (bucket) bucket.push(doc);
      else itemsByOrder.set(orderId, [doc]);
    }

    const result = orders.map((o: unknown) => {
      const doc = formatDoc(o)!;
      doc.items = itemsByOrder.get(Number(doc.id)) ?? [];
      return doc;
    });
    return NextResponse.json(result);
  } catch (err) {
    return serverError(err);
  }
}
