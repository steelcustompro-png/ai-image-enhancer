const http = require('http');
const { writeFile, readFile, unlink, mkdir } = require('fs/promises');
const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const crypto = require('crypto');

const execFileAsync = promisify(execFile);
const REALESRGAN_BIN = '/usr/local/realesrgan/realesrgan-ncnn-vulkan';
const TMP_DIR = '/tmp/enhance-jobs';
const PORT = 3001;

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://ai-image-enhancer.pages.dev',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

function setCors(req, res) {
  const origin = req.headers.origin || '';
  // Allow any *.pages.dev subdomain or listed origins
  if (ALLOWED_ORIGINS.includes(origin) || /\.pages\.dev$/.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

const server = http.createServer(async (req, res) => {
  setCors(req, res);

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/enhance') {
    try {
      // Parse multipart form data manually
      const boundary = getBoundary(req.headers['content-type']);
      if (!boundary) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid content type' }));
        return;
      }

      const body = await collectBody(req, 20 * 1024 * 1024); // 20MB limit
      const parts = parseMultipart(body, boundary);

      const imagePart = parts.find(p => p.name === 'image');
      const scalePart = parts.find(p => p.name === 'scale');

      if (!imagePart) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No image provided' }));
        return;
      }

      const scale = Number(scalePart?.value || 2);
      const validScale = scale === 4 ? 4 : 2;

      await mkdir(TMP_DIR, { recursive: true });
      const id = crypto.randomUUID();
      const rawPath = path.join(TMP_DIR, `${id}-raw`);
      const inputPath = path.join(TMP_DIR, `${id}-input.png`);
      const outputPath = path.join(TMP_DIR, `${id}-output.png`);

      await writeFile(rawPath, imagePart.data);

      // Fix EXIF orientation
      await execFileAsync('convert', [rawPath, '-auto-orient', inputPath], { timeout: 10000 });

      // Run Real-ESRGAN
      const model = validScale === 4 ? 'realesr-animevideov3-x4' : 'realesr-animevideov3-x2';
      await execFileAsync(REALESRGAN_BIN, [
        '-i', inputPath, '-o', outputPath,
        '-n', model, '-s', String(validScale),
      ], { timeout: 300000 });

      const resultBuffer = await readFile(outputPath);

      // Cleanup
      await unlink(rawPath).catch(() => {});
      await unlink(inputPath).catch(() => {});
      await unlink(outputPath).catch(() => {});

      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="enhanced-${validScale}x.png"`,
        'Content-Length': resultBuffer.length,
      });
      res.end(resultBuffer);
    } catch (err) {
      console.error('Enhance error:', err.message || err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message || 'Enhancement failed' }));
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// --- Multipart parser helpers ---

function getBoundary(contentType) {
  if (!contentType) return null;
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^\s;]+))/);
  return match ? (match[1] || match[2]) : null;
}

function collectBody(req, maxSize) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxSize) { req.destroy(); reject(new Error('File too large')); return; }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function parseMultipart(body, boundary) {
  const parts = [];
  const boundaryBuf = Buffer.from(`--${boundary}`);
  const endBuf = Buffer.from(`--${boundary}--`);

  let start = indexOf(body, boundaryBuf, 0);
  if (start === -1) return parts;

  while (true) {
    start += boundaryBuf.length;
    // Skip \r\n after boundary
    if (body[start] === 0x0d && body[start + 1] === 0x0a) start += 2;

    const nextBoundary = indexOf(body, boundaryBuf, start);
    if (nextBoundary === -1) break;

    const partData = body.slice(start, nextBoundary);
    // Find header/body separator \r\n\r\n
    const headerEnd = indexOf(partData, Buffer.from('\r\n\r\n'), 0);
    if (headerEnd === -1) { start = nextBoundary; continue; }

    const headerStr = partData.slice(0, headerEnd).toString('utf8');
    let content = partData.slice(headerEnd + 4);
    // Remove trailing \r\n
    if (content.length >= 2 && content[content.length - 2] === 0x0d && content[content.length - 1] === 0x0a) {
      content = content.slice(0, content.length - 2);
    }

    const nameMatch = headerStr.match(/name="([^"]+)"/);
    const name = nameMatch ? nameMatch[1] : '';
    const filenameMatch = headerStr.match(/filename="([^"]+)"/);

    if (filenameMatch) {
      parts.push({ name, filename: filenameMatch[1], data: content });
    } else {
      parts.push({ name, value: content.toString('utf8') });
    }

    // Check if next boundary is the end
    if (indexOf(body, endBuf, nextBoundary) === nextBoundary) break;
    start = nextBoundary;
  }

  return parts;
}

function indexOf(buf, search, from) {
  for (let i = from; i <= buf.length - search.length; i++) {
    let found = true;
    for (let j = 0; j < search.length; j++) {
      if (buf[i + j] !== search[j]) { found = false; break; }
    }
    if (found) return i;
  }
  return -1;
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Enhance API server running on port ${PORT}`);
});
