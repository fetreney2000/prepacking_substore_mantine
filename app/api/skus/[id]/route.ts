import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/server/_db';
import { getSKUModel, getOrderItemModel } from '@/lib/server/_schemas';
import { badRequest, formatDoc, notFound, parseBody, serverError } from '@/lib/server/_helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type Context = { params: Promise<{ id: string }> };

async function readId({ params }: Context): Promise<number | null> {
  const { id } = await params;
  const numId = parseInt(id, 10);
  return Number.isNaN(numId) ? null : numId;
}

export async function GET(_req: NextRequest, ctx: Context) {
  try {
    await dbConnect();
    const SKU = getSKUModel();
    const numId = await readId(ctx);
    if (numId === null) return badRequest('ID tidak sah');
    const sku = await SKU.findById(numId).lean();
    if (!sku) return notFound('SKU tidak dijumpai');
    return NextResponse.json(formatDoc(sku));
  } catch (err) {
    return serverError(err);
  }
}

export async function PUT(req: NextRequest, ctx: Context) {
  try {
    await dbConnect();
    const SKU = getSKUModel();
    const OrderItem = getOrderItemModel();
    const numId = await readId(ctx);
    if (numId === null) return badRequest('ID tidak sah');
    const body = await parseBody(req);
    if (body === null) return badRequest('Format JSON tidak sah');
    const { _id, id: rid, ...fields } = body;
    if (fields.kod) {
      const existing = await SKU.findOne({ kod: fields.kod, _id: { $ne: numId } }).lean();
      if (existing) return badRequest(`Kod ${fields.kod} sudah wujud`);
      const oldSku = await SKU.findById(numId).lean();
      if (oldSku && oldSku.kod !== fields.kod) {
        await OrderItem.updateMany({ skuId: numId }, { kod: fields.kod });
        await OrderItem.updateMany(
          { skuId: null, kod: oldSku.kod },
          { kod: fields.kod, skuId: numId }
        );
      }
    }
    const updated = await SKU.findByIdAndUpdate(numId, fields, { new: true }).lean();
    if (!updated) return notFound('SKU tidak dijumpai');
    return NextResponse.json(formatDoc(updated));
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(_req: NextRequest, ctx: Context) {
  try {
    await dbConnect();
    const SKU = getSKUModel();
    const OrderItem = getOrderItemModel();
    const numId = await readId(ctx);
    if (numId === null) return badRequest('ID tidak sah');
    const itemCount = await OrderItem.countDocuments({ skuId: numId });
    if (itemCount > 0) {
      return NextResponse.json(
        { error: `Tidak boleh padam: terdapat ${itemCount} item pesanan yang merujuk SKU ini.` },
        { status: 400 }
      );
    }
    const deleted = await SKU.findByIdAndDelete(numId);
    if (!deleted) return notFound('SKU tidak dijumpai');
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError(err);
  }
}
