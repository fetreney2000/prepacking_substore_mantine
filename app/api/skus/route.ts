import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/server/_db';
import { getSKUModel } from '@/lib/server/_schemas';
import { badRequest, formatDoc, getNextId, parseBody, serverError } from '@/lib/server/_helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const SKU = getSKUModel();
    const groupId = req.nextUrl.searchParams.get('groupId');
    const query: Record<string, unknown> = {};
    if (groupId) query.groupId = parseInt(groupId, 10);
    const skus = await SKU.find(query).sort({ _id: 1 }).lean();
    return NextResponse.json(skus.map(formatDoc));
  } catch (err) {
    return serverError(err);
  }
}

type CreateSkuBody = {
  kod?: string;
  nama?: string;
  saizPek?: number;
  groupId?: number | null;
  enabled?: boolean;
  fullStockAlways?: boolean;
  notes?: string;
  stokSemasa?: number;
  usageMonth1?: number;
  usageMonth2?: number;
  usageMonth3?: number;
  useManualLevels?: boolean;
  minManual?: number;
  penimbalManual?: number;
  maksManual?: number;
};

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const SKU = getSKUModel();
    const body = await parseBody<CreateSkuBody>(req);
    if (body === null) return badRequest('Format JSON tidak sah');
    const {
      kod, nama, saizPek, groupId, enabled, fullStockAlways, notes, stokSemasa,
      usageMonth1, usageMonth2, usageMonth3, useManualLevels, minManual, penimbalManual, maksManual,
    } = body;
    if (!kod || !nama) return badRequest('Kod dan nama diperlukan');
    const existing = await SKU.findOne({ kod }).lean();
    if (existing) return badRequest(`Kod ${kod} sudah wujud`);
    const nextId = await getNextId(SKU);
    const created = await SKU.create({
      _id: nextId,
      kod,
      nama,
      saizPek: saizPek || 1,
      groupId: groupId || null,
      enabled: enabled !== undefined ? enabled : true,
      fullStockAlways: fullStockAlways || false,
      notes: notes || '',
      stokSemasa: stokSemasa || 0,
      usageMonth1: usageMonth1 || 0,
      usageMonth2: usageMonth2 || 0,
      usageMonth3: usageMonth3 || 0,
      useManualLevels: useManualLevels || false,
      minManual: minManual || 0,
      penimbalManual: penimbalManual || 0,
      maksManual: maksManual || 0,
    });
    return NextResponse.json(formatDoc(created), { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}
