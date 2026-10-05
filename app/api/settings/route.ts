import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/server/_db';
import { getSettingModel } from '@/lib/server/_schemas';
import { badRequest, formatDoc, parseBody, serverError } from '@/lib/server/_helpers';

// Reads/writes live MongoDB data — never prerender or cache these responses.
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  try {
    await dbConnect();
    const Setting = getSettingModel();
    let settings = await Setting.findById(3).lean();
    if (!settings) {
      const created = await Setting.create({ _id: 3 });
      settings = created.toObject();
    }
    return NextResponse.json(formatDoc(settings));
  } catch (err) {
    return serverError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    const Setting = getSettingModel();
    const body = await parseBody(req);
    if (body === null) return badRequest('Format JSON tidak sah');
    const { _id, id, ...fields } = body;
    const updated = await Setting.findByIdAndUpdate(3, fields, { new: true, upsert: true }).lean();
    return NextResponse.json(formatDoc(updated));
  } catch (err) {
    return serverError(err);
  }
}
