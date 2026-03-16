import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import crypto from 'crypto';

const execFileAsync = promisify(execFile);
const REALESRGAN_BIN = '/usr/local/realesrgan/realesrgan-ncnn-vulkan';
const TMP_DIR = '/tmp/enhance-jobs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as File | null;
    const scale = Number(formData.get('scale') || 2);

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Validate scale
    const validScale = scale === 4 ? 4 : 2;

    // Save uploaded file to temp
    await mkdir(TMP_DIR, { recursive: true });
    const id = crypto.randomUUID();
    const rawPath = path.join(TMP_DIR, `${id}-raw`);
    const inputPath = path.join(TMP_DIR, `${id}-input.png`);
    const outputPath = path.join(TMP_DIR, `${id}-output.png`);

    const bytes = await file.arrayBuffer();
    await writeFile(rawPath, Buffer.from(bytes));

    // Fix EXIF orientation before processing (JPEG rotation metadata)
    await execFileAsync('convert', [
      rawPath, '-auto-orient', inputPath,
    ], { timeout: 10000 });

    // Run Real-ESRGAN (timeout 5 min for CPU)
    await execFileAsync(REALESRGAN_BIN, [
      '-i', inputPath,
      '-o', outputPath,
      '-n', 'realesr-animevideov3-x2',
      '-s', String(validScale),
    ], { timeout: 300000 });

    // Read result and clean up
    const resultBuffer = await readFile(outputPath);
    await unlink(rawPath).catch(() => {});
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});

    return new NextResponse(resultBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="enhanced-${validScale}x.png"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Enhancement failed';
    console.error('Enhance API error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
