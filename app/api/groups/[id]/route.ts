import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/server/_db';
import { getGroupModel, getSKUModel } from '@/lib/server/_schemas';
import { badRequest, formatDoc, notFound, parseBody, serverError } from '@/lib/server/_helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type Context = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Context) {
  try {
    await dbConnect();
    const Group = getGroupModel();
    const { id } = await params;
    const numId = parseInt(id, 10);
    if (Number.isNaN(numId)) return badRequest('ID tidak sah');
    const body = await parseBody(req);
    if (body === null) return badRequest('Format JSON tidak sah');
    const { _id, id: rid, ...fields } = body;
    const updated = await Group.findByIdAndUpdate(numId, fields, { new: true }).lean();
    if (!updated) return notFound('Kumpulan tidak dijumpai');
    return NextResponse.json(formatDoc(updated));
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Context) {
  try {
    await dbConnect();
    const Group = getGroupModel();
    const SKU = getSKUModel();
    const { id } = await params;
    const numId = parseInt(id, 10);
    if (Number.isNaN(numId)) return badRequest('ID tidak sah');
    const skuCount = await SKU.countDocuments({ groupId: numId });
    if (skuCount > 0) {
      return NextResponse.json(
        { error: `Tidak boleh padam: terdapat ${skuCount} SKU dalam kumpulan ini.` },
        { status: 400 }
      );
    }
    const deleted = await Group.findByIdAndDelete(numId);
    if (!deleted) return notFound('Kumpulan tidak dijumpai');
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError(err);
  }
}
