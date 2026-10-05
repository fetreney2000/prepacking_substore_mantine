import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/server/_db';
import { getOrderItemModel } from '@/lib/server/_schemas';
import { badRequest, formatDoc, serverError } from '@/lib/server/_helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const OrderItem = getOrderItemModel();
    const orderId = req.nextUrl.searchParams.get('orderId');
    if (!orderId) return badRequest('orderId diperlukan');
    const items = await OrderItem.find({ orderId: parseInt(orderId, 10) })
      .sort({ _id: 1 })
      .lean();
    return NextResponse.json(items.map((i: unknown) => formatDoc(i)));
  } catch (err) {
    return serverError(err);
  }
}
