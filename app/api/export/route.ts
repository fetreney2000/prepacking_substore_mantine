import { NextResponse } from 'next/server';
import dbConnect from '@/lib/server/_db';
import {
  getSettingModel,
  getGroupModel,
  getSKUModel,
  getOrderModel,
  getOrderItemModel,
} from '@/lib/server/_schemas';
import { formatDoc, serverError } from '@/lib/server/_helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  try {
    await dbConnect();
    const Setting = getSettingModel();
    const Group = getGroupModel();
    const SKU = getSKUModel();
    const Order = getOrderModel();
    const OrderItem = getOrderItemModel();

    const settingsArr = await Setting.find().lean();
    const groups = await Group.find().lean();
    const skus = await SKU.find().lean();
    const orders = await Order.find().lean();
    const orderItems = await OrderItem.find().lean();

    return NextResponse.json({
      settings: settingsArr.map((d: unknown) => formatDoc(d)),
      groups: groups.map((d: unknown) => formatDoc(d)),
      skus: skus.map((d: unknown) => formatDoc(d)),
      orders: orders.map((d: unknown) => formatDoc(d)),
      orderItems: orderItems.map((d: unknown) => formatDoc(d)),
      exportedAt: new Date().toISOString(),
      version: Date.now(),
    });
  } catch (err) {
    return serverError(err);
  }
}
