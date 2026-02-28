import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const ext = path.extname(file.name);
  const filename = `${uuidv4()}${ext}`;
  const filepath = path.join(uploadsDir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filepath, buffer);

  const mimeType = file.type;
  let assetType: string = 'image';
  if (mimeType.startsWith('video/')) assetType = 'video';
  else if (mimeType.startsWith('image/')) assetType = 'image';

  return NextResponse.json({
    url: `/uploads/${filename}`,
    originalName: file.name,
    mimeType,
    size: file.size,
    assetType,
  });
}
