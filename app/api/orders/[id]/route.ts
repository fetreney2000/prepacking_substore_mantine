import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/server/_db';
import { getOrderModel, getOrderItemModel, getSKUModel } from '@/lib/server/_schemas';
import {
  badRequest,
  formatDoc,
  notFound,
  parseBody,
  reserveIds,
  resolveSkuIdsByKod,
  serverError,
  withTransaction,
} from '@/lib/server/_helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type Context = { params: Promise<{ id: string }> };

type OrderItemInput = {
  skuId?: number | null;
  kod?: string;
  qtyOrdered?: number;
  notes?: string;
};

type UpdateOrderBody = {
  tarikh?: string;
  namaPembuat?: string;
  tempohMinggu?: number;
  notes?: string;
  items?: OrderItemInput[];
};

async function readId({ params }: Context): Promise<number | null> {
  const { id } = await params;
  const numId = parseInt(id, 10);
  return Number.isNaN(numId) ? null : numId;
}

export async function GET(_req: NextRequest, ctx: Context) {
  try {
    await dbConnect();
    const Order = getOrderModel();
    const OrderItem = getOrderItemModel();
    const numId = await readId(ctx);
    if (numId === null) return badRequest('ID tidak sah');
    const order = await Order.findById(numId).lean();
    if (!order) return notFound('Pesanan tidak dijumpai');
    const items = await OrderItem.find({ orderId: numId }).sort({ _id: 1 }).lean();
    const formatted = formatDoc(order)!;
    formatted.items = items.map((i: unknown) => formatDoc(i));
    return NextResponse.json(formatted);
  } catch (err) {
    return serverError(err);
  }
}

export async function PUT(req: NextRequest, ctx: Context) {
  try {
    await dbConnect();
    const Order = getOrderModel();
    const OrderItem = getOrderItemModel();
    const SKU = getSKUModel();
    const numId = await readId(ctx);
    if (numId === null) return badRequest('ID tidak sah');
    const body = await parseBody<UpdateOrderBody>(req);
    if (body === null) return badRequest('Format JSON tidak sah');
    const { tarikh, namaPembuat, tempohMinggu, notes, items } = body;
    const existing = await Order.findById(numId);
    if (!existing) return notFound('Pesanan tidak dijumpai');
    const updateFields: Record<string, unknown> = {};
    if (tarikh !== undefined) updateFields.tarikh = tarikh;
    if (namaPembuat !== undefined) updateFields.namaPembuat = namaPembuat;
    if (tempohMinggu !== undefined) updateFields.tempohMinggu = tempohMinggu;
    if (notes !== undefined) updateFields.notes = notes;

    // Rebuild the item set as plain documents first — one $in lookup for all
    // `kod`s, one id reservation for the batch — then swap it in below.
    const replacing = items && Array.isArray(items) ? items : null;
    const skuIdByKod = replacing
      ? await resolveSkuIdsByKod(replacing.map((i) => i.kod), SKU)
      : new Map<string, number>();
    const firstItemId = replacing?.length ? await reserveIds(OrderItem, replacing.length) : 0;
    const itemDocs = (replacing ?? []).map((item, i) => ({
      _id: firstItemId + i,
      orderId: numId,
      skuId: item.skuId || (item.kod ? skuIdByKod.get(item.kod) ?? null : null),
      kod: item.kod,
      qtyOrdered: item.qtyOrdered || 0,
      notes: item.notes || '',
    }));

    // The old delete-then-recreate loop could fail half way and leave the
    // order with no items (or half of them) — now the swap is all-or-nothing.
    await withTransaction(async (session) => {
      await Order.findByIdAndUpdate(numId, updateFields, { session });
      if (replacing) {
        await OrderItem.deleteMany({ orderId: numId }, { session });
        if (itemDocs.length) await OrderItem.insertMany(itemDocs, { session });
      }
    });
    const updatedOrder = await Order.findById(numId).lean();
    const updatedItems = await OrderItem.find({ orderId: numId }).sort({ _id: 1 }).lean();
    const result = formatDoc(updatedOrder)!;
    result.items = updatedItems.map((i: unknown) => formatDoc(i));
    return NextResponse.json(result);
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(_req: NextRequest, ctx: Context) {
  try {
    await dbConnect();
    const Order = getOrderModel();
    const OrderItem = getOrderItemModel();
    const numId = await readId(ctx);
    if (numId === null) return badRequest('ID tidak sah');
    const existing = await Order.findById(numId);
    if (!existing) return notFound('Pesanan tidak dijumpai');
    // Order and its items are removed together.
    await withTransaction(async (session) => {
      await Order.findByIdAndDelete(numId, { session });
      await OrderItem.deleteMany({ orderId: numId }, { session });
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError(err);
  }
}
