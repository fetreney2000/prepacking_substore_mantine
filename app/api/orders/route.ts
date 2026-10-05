import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/server/_db';
import { getOrderModel, getOrderItemModel, getSKUModel } from '@/lib/server/_schemas';
import {
  badRequest,
  formatDoc,
  getNextId,
  parseBody,
  reserveIds,
  resolveSkuIdsByKod,
  serverError,
  withTransaction,
} from '@/lib/server/_helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  try {
    await dbConnect();
    const Order = getOrderModel();
    const OrderItem = getOrderItemModel();
    const orders = await Order.find().sort({ tarikh: -1 }).lean();
    // One $group yields every order's item count — the old loop ran one
    // countDocuments per order (one round trip each).
    const counts: Array<{ _id: number; count: number }> = await OrderItem.aggregate([
      { $group: { _id: '$orderId', count: { $sum: 1 } } },
    ]);
    const countByOrder = new Map(counts.map((c) => [Number(c._id), c.count]));
    const formatted = orders.map((o: unknown) => {
      const doc = formatDoc(o)!;
      doc.itemCount = countByOrder.get(Number(doc.id)) ?? 0;
      return doc;
    });
    return NextResponse.json(formatted);
  } catch (err) {
    return serverError(err);
  }
}

type OrderItemInput = {
  skuId?: number | null;
  kod?: string;
  qtyOrdered?: number;
  notes?: string;
};

type CreateOrderBody = {
  tarikh?: string;
  namaPembuat?: string;
  tempohMinggu?: number;
  notes?: string;
  items?: OrderItemInput[];
};

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const Order = getOrderModel();
    const OrderItem = getOrderItemModel();
    const SKU = getSKUModel();
    const body = await parseBody<CreateOrderBody>(req);
    if (body === null) return badRequest('Format JSON tidak sah');
    const { tarikh, namaPembuat, tempohMinggu, notes, items } = body;
    if (!tarikh || !namaPembuat) return badRequest('Tarikh dan nama pembuat diperlukan');

    // Everything read-only happens before the transaction: id reservation,
    // and a single $in lookup for every item that only carries a `kod`.
    const nextId = await getNextId(Order);
    const batch = items ?? [];
    const skuIdByKod = await resolveSkuIdsByKod(batch.map((i) => i.kod), SKU);
    const firstItemId = batch.length ? await reserveIds(OrderItem, batch.length) : 0;
    const itemDocs = batch.map((item, i) => ({
      _id: firstItemId + i,
      orderId: nextId,
      skuId: item.skuId || (item.kod ? skuIdByKod.get(item.kod) ?? null : null),
      kod: item.kod,
      qtyOrdered: item.qtyOrdered || 0,
      notes: item.notes || '',
    }));

    // Order + items land together, in two writes instead of one per item.
    await withTransaction(async (session) => {
      await Order.create(
        [{ _id: nextId, tarikh, namaPembuat, tempohMinggu: tempohMinggu || 0, notes: notes || '' }],
        { session }
      );
      if (itemDocs.length) await OrderItem.insertMany(itemDocs, { session });
    });

    return NextResponse.json({ success: true, id: nextId }, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}
