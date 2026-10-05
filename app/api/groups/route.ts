import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/server/_db';
import { getGroupModel } from '@/lib/server/_schemas';
import { badRequest, formatDoc, getNextId, parseBody, serverError } from '@/lib/server/_helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  try {
    await dbConnect();
    const Group = getGroupModel();
    const groups = await Group.find().sort({ name: 1 }).lean();
    return NextResponse.json(groups.map(formatDoc));
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const Group = getGroupModel();
    const body = await parseBody<{ name?: string; notes?: string }>(req);
    if (body === null) return badRequest('Format JSON tidak sah');
    const { name, notes } = body;
    if (!name) return badRequest('Nama kumpulan diperlukan');
    const nextId = await getNextId(Group);
    const created = await Group.create({ _id: nextId, name, notes: notes || '' });
    return NextResponse.json(formatDoc(created), { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}
