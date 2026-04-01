const { handleRegister, handleLogin } = require('./auth-handlers');
const http = require('http');
const { writeFile, readFile, unlink, mkdir } = require('fs/promises');
const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');

const execFileAsync = promisify(execFile);
const REALESRGAN_BIN = '/usr/local/realesrgan/realesrgan-ncnn-vulkan';
const TMP_DIR = '/tmp/enhance-jobs';
const ALIYUN_API_KEY = 'sk-752c05ce5f844955ae189b2fdefd72c0';

// 阿里云超分：上传图片到临时URL并调用DashScope API
async function enhanceWithAliyun(imageBuffer, scale) {
  const https = require('https');
  
  // 1. 把图片转base64上传到阿里云OSS临时URL（用DashScope file upload）
  const base64Image = imageBuffer.toString('base64');
  const mimeType = 'image/png';
  
  // 使用DashScope的file upload接口
  const uploadRes = await fetch('https://dashscope.aliyuncs.com/api/v1/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ALIYUN_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      files: [{ name: 'image.png', content: base64Image, content_type: mimeType }]
    })
  });
  
  let imageUrl;
  if (uploadRes.ok) {
    const uploadData = await uploadRes.json();
    imageUrl = uploadData?.output?.files?.[0]?.url;
  }
  
  // 如果upload失败，改用data URL直传
  if (!imageUrl) {
    imageUrl = `data:${mimeType};base64,${base64Image}`;
  }
  
  // 2. 提交超分任务
  const submitRes = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ALIYUN_API_KEY}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable',
    },
    body: JSON.stringify({
      model: 'wanx2.1-imageedit',
      input: {
        function: 'super_resolution',
        base_image_url: imageUrl,
        prompt: 'enhance image quality, increase resolution, sharp details',
      },
      parameters: { upscale_factor: scale }
    })
  });
  
  const submitData = await submitRes.json();
  if (!submitData?.output?.task_id) {
    throw new Error('超分任务提交失败: ' + JSON.stringify(submitData));
  }
  
  const taskId = submitData.output.task_id;
  
  // 3. 轮询任务结果（最多等120秒）
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const pollRes = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
      headers: { 'Authorization': `Bearer ${ALIYUN_API_KEY}` }
    });
    const pollData = await pollRes.json();
    const status = pollData?.output?.task_status;
    
    if (status === 'SUCCEEDED') {
      const resultUrl = pollData?.output?.output_image_url?.[0] || pollData?.output?.results?.[0]?.url;
      if (!resultUrl) throw new Error('超分结果URL为空');
      
      // 4. 下载结果图片
      const imgRes = await fetch(resultUrl);
      const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
      return imgBuffer;
    } else if (status === 'FAILED') {
      throw new Error('超分任务失败: ' + JSON.stringify(pollData?.output));
    }
  }
  throw new Error('超分任务超时');
}
const PORT = 3001;
const JWT_SECRET = "ai-image-enhancer-jwt-secret-2024";

// Email Verification
const verificationCodes = new Map();
function generateCode() { return Math.floor(100000 + Math.random() * 900000).toString(); }
function sendVerificationEmail(email, code) { console.log(`Verification code for ${email}: ${code}`); }
function getOrCreateEmailUser(email) {
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    const result = db.prepare('INSERT INTO users (email, credits) VALUES (?, ?)').run(email, 3);
    user = { id: result.lastInsertRowid, email, credits: 3, plan: 'free' };
  }
  return user;
}
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

// --- Database Setup ---
const DB_PATH = path.join(__dirname, 'data', 'app.db');
require('fs').mkdirSync(path.join(__dirname, 'data'), { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT UNIQUE,
    github_id TEXT UNIQUE,
    linkedin_id TEXT UNIQUE,
    facebook_id TEXT UNIQUE,
    email TEXT NOT NULL,
    name TEXT,
    avatar TEXT,
    plan TEXT DEFAULT 'free',
    credits INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS usage_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    ip TEXT,
    scale INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_usage_user_date ON usage_log(user_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_usage_ip_date ON usage_log(ip, created_at);
`);

// --- Daily usage limits ---
const LIMITS = { anonymous: 1, free: 3, paid: 999999 };

function getTodayUsage(userId, ip) {
  const today = new Date().toISOString().slice(0, 10);
  if (userId) {
    const row = db.prepare(
      `SELECT COUNT(*) as cnt FROM usage_log WHERE user_id = ? AND created_at >= ?`
    ).get(userId, today + 'T00:00:00');
    return row.cnt;
  }
  const row = db.prepare(
    `SELECT COUNT(*) as cnt FROM usage_log WHERE user_id IS NULL AND ip = ? AND created_at >= ?`
  ).get(ip, today + 'T00:00:00');
  return row.cnt;
}

function logUsage(userId, ip, scale) {
  db.prepare(
    `INSERT INTO usage_log (user_id, ip, scale) VALUES (?, ?, ?)`
  ).run(userId, ip, scale);
}

function getOrCreateUser(provider, providerId, email, name, avatar) {
  const idColumn = `${provider}_id`;
  let user = db.prepare(`SELECT * FROM users WHERE ${idColumn} = ?`).get(providerId);
  if (!user) {
    // 检查邮箱是否已存在（可能用其他方式登录过）
    user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (user) {
      // 绑定新的登录方式
      db.prepare(`UPDATE users SET ${idColumn} = ?, name = COALESCE(name, ?), avatar = COALESCE(avatar, ?) WHERE id = ?`)
        .run(providerId, name, avatar, user.id);
    } else {
      // 创建新用户
      db.prepare(
        `INSERT INTO users (${idColumn}, email, name, avatar) VALUES (?, ?, ?, ?)`
      ).run(providerId, email, name, avatar);
      user = db.prepare(`SELECT * FROM users WHERE ${idColumn} = ?`).get(providerId);
    }
  }
  return user;
}

function signToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, name: user.name, avatar: user.avatar, plan: user.plan },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function verifyToken(token) {
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

function getUserFromReq(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return token ? verifyToken(token) : null;
}

function getClientIp(req) {
  return req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
}

// --- CORS ---
const ALLOWED_ORIGINS = [
  'https://aiimageenhancer.xyz',
  'https://www.aiimageenhancer.xyz',
  'https://ai-image-enhancer-f13.pages.dev',
  'https://api.aiimageenhancer.xyz',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

function setCors(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin) || /\.pages\.dev$/.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// --- Multipart parser ---
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
  let start = indexOf(body, boundaryBuf, 0);
  if (start === -1) return parts;
  while (true) {
    start += boundaryBuf.length;
    if (body[start] === 0x0d && body[start + 1] === 0x0a) start += 2;
    const nextBoundary = indexOf(body, boundaryBuf, start);
    if (nextBoundary === -1) break;
    const partData = body.slice(start, nextBoundary);
    const headerEnd = indexOf(partData, Buffer.from('\r\n\r\n'), 0);
    if (headerEnd === -1) { start = nextBoundary; continue; }
    const headerStr = partData.slice(0, headerEnd).toString('utf8');
    let content = partData.slice(headerEnd + 4);
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
    if (indexOf(body, Buffer.from(`--${boundary}--`), nextBoundary) === nextBoundary) break;
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

function collectJSON(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch(e) { reject(e); } });
    req.on('error', reject);
  });
}

// --- Routes ---
const server = http.createServer(async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // --- Google OAuth callback ---
  // Email: Send code
  
  // Register
  if (req.method === 'POST' && url.pathname === '/api/auth/register') {
    const body = await collectJSON(req);
    const result = handleRegister(db, body.email, body.password);
    if (result.error) { res.writeHead(400); res.end(JSON.stringify(result)); return; }
    res.writeHead(200); res.end(JSON.stringify(result)); return;
  }

  // Login
  if (req.method === 'POST' && url.pathname === '/api/auth/login') {
    const body = await collectJSON(req);
    const result = handleLogin(db, body.email, body.password);
    if (result.error) { res.writeHead(401); res.end(JSON.stringify(result)); return; }
    res.writeHead(200); res.end(JSON.stringify(result)); return;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/email/send') {
    const body = await collectJSON(req);
    const { email } = body;
    if (!email || !email.includes('@')) { res.writeHead(400); res.end(JSON.stringify({ error: 'Invalid email' })); return; }
    const code = generateCode();
    verificationCodes.set(email, { code, expires: Date.now() + 10 * 60 * 1000 });
    sendVerificationEmail(email, code);
    res.writeHead(200); res.end(JSON.stringify({ success: true }));
    return;
  }
  
  // Email: Verify code
  if (req.method === 'POST' && url.pathname === '/api/auth/email/verify') {
    const body = await collectJSON(req);
    const { email, code } = body;
    const stored = verificationCodes.get(email);
    if (!stored || stored.code !== code || Date.now() > stored.expires) {
      res.writeHead(401); res.end(JSON.stringify({ error: 'Invalid or expired code' })); return;
    }
    verificationCodes.delete(email);
    const user = getOrCreateEmailUser(email);
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
    res.writeHead(200); res.end(JSON.stringify({ token, user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar, plan: user.plan, credits: user.credits } }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/google') {
    try {
      const { credential } = await collectJSON(req);
      // Verify Google ID token
      const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
      const payload = await resp.json();
      if (payload.error || (GOOGLE_CLIENT_ID && payload.aud !== GOOGLE_CLIENT_ID)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid Google token' }));
        return;
      }
      const user = getOrCreateUser('google', payload.sub, payload.email, payload.name, payload.picture);
      const token = signToken(user);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ token, user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar, plan: user.plan } }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/github') {
    try {
      const { code } = await collectJSON(req);
      const clientId = process.env.GITHUB_CLIENT_ID || '';
      const clientSecret = process.env.GITHUB_CLIENT_SECRET || '';
      
      // Exchange code for access token
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code })
      });
      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to get GitHub access token' }));
        return;
      }
      
      // Get user info
      const userRes = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}`, 'User-Agent': 'AI-Image-Enhancer' }
      });
      const userData = await userRes.json();
      
      const user = getOrCreateUser('github', String(userData.id), userData.email || `${userData.login}@github.user`, userData.name || userData.login, userData.avatar_url);
      const token = signToken(user);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ token, user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar, plan: user.plan } }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/linkedin') {
    try {
      const { code } = await collectJSON(req);
      const clientId = process.env.LINKEDIN_CLIENT_ID || '';
      const clientSecret = process.env.LINKEDIN_CLIENT_SECRET || '';
      const redirectUri = 'https://aiimageenhancer.xyz';
      
      // Exchange code for access token
      const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=authorization_code&code=${code}&client_id=${clientId}&client_secret=${clientSecret}&redirect_uri=${encodeURIComponent(redirectUri)}`
      });
      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to get LinkedIn access token' }));
        return;
      }
      
      // Get user info
      const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
      });
      const userData = await userRes.json();
      
      const user = getOrCreateUser('linkedin', userData.sub, userData.email, userData.name, userData.picture);
      const token = signToken(user);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ token, user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar, plan: user.plan } }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/facebook') {
    try {
      const { accessToken } = await collectJSON(req);
      
      // Get user info
      const userRes = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`);
      const userData = await userRes.json();
      
      if (userData.error) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid Facebook token' }));
        return;
      }
      
      const user = getOrCreateUser('facebook', userData.id, userData.email || `${userData.id}@facebook.user`, userData.name, userData.picture?.data?.url);
      const token = signToken(user);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ token, user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar, plan: user.plan } }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // --- Get current user info + usage ---
  if (req.method === 'GET' && url.pathname === '/api/auth/me') {
    const tokenUser = getUserFromReq(req);
    if (!tokenUser) {
      const ip = getClientIp(req);
      const used = getTodayUsage(null, ip);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ user: null, usage: { used, limit: LIMITS.anonymous } }));
      return;
    }
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(tokenUser.userId);
    const used = getTodayUsage(user.id, null);
    const plan = user.credits > 0 ? 'paid' : user.plan;
    const limit = plan === 'paid' ? LIMITS.paid : LIMITS.free;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar, plan, credits: user.credits },
      usage: { used, limit }
    }));
    return;
  }

  // --- 使用记录 ---
  if (req.method === 'GET' && url.pathname === '/api/auth/history') {
    const tokenUser = getUserFromReq(req);
    if (!tokenUser) { res.writeHead(401); res.end(JSON.stringify({ error: 'Unauthorized' })); return; }
    const records = db.prepare(
      'SELECT id, scale, created_at FROM usage_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
    ).all(tokenUser.userId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ records }));
    return;
  }

  // --- 充值记录 ---
  if (req.method === 'GET' && url.pathname === '/api/pay/history') {
    const tokenUser = getUserFromReq(req);
    if (!tokenUser) { res.writeHead(401); res.end(JSON.stringify({ error: 'Unauthorized' })); return; }
    const records = db.prepare(
      "SELECT id, amount, credits, currency, status, created_at FROM payment_log WHERE user_id = ? AND status != 'pending' ORDER BY created_at DESC LIMIT 50"
    ).all(tokenUser.userId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ records }));
    return;
  }

  // --- PayPal 支付 ---
  const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
  const PAYPAL_SECRET = process.env.PAYPAL_SECRET || '';
  const PAYPAL_BASE = process.env.PAYPAL_SANDBOX === 'true'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';
  const SITE_URL = 'https://aiimageenhancer.xyz';
  const API_URL = 'https://api.aiimageenhancer.xyz';

  async function getPaypalToken() {
    const creds = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
    const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials'
    });
    const data = await res.json();
    return data.access_token;
  }

  // 创建支付订单
  if (req.method === 'POST' && url.pathname === '/api/pay/create') {
    const tokenUser = getUserFromReq(req);
    if (!tokenUser) { res.writeHead(401); res.end(JSON.stringify({ error: 'Unauthorized' })); return; }
    const body = await collectJSON(req);
    const { price, credits } = body;
    if (!price || !credits) { res.writeHead(400); res.end(JSON.stringify({ error: 'Missing price or credits' })); return; }
    try {
      const accessToken = await getPaypalToken();
      const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            amount: { currency_code: 'USD', value: price.toFixed(2) },
            description: `AI Image Enhancer - ${credits} Credits`,
            custom_id: `${tokenUser.userId}:${credits}`,
          }],
          application_context: {
            brand_name: 'AI Image Enhancer',
            return_url: `${API_URL}/api/pay/success`,
            cancel_url: `${API_URL}/api/pay/cancel`,
          }
        })
      });
      const order = await orderRes.json();
      const approveUrl = order.links?.find(l => l.rel === 'approve')?.href;
      if (!approveUrl) throw new Error('No approve URL: ' + JSON.stringify(order));
      // 记录待支付订单
      db.prepare('INSERT OR IGNORE INTO payment_log (user_id, amount, credits, currency, paypal_order_id, status) VALUES (?,?,?,?,?,?)')
        .run(tokenUser.userId, price, credits, 'USD', order.id, 'pending');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ approveUrl, orderId: order.id }));
    } catch (e) {
      console.error('PayPal create error:', e.message);
      res.writeHead(500); res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // 支付成功回调（PayPal重定向回来）
  if (req.method === 'GET' && url.pathname === '/api/pay/success') {
    const orderId = url.searchParams.get('token');
    if (!orderId) { res.writeHead(400); res.end('Missing token'); return; }
    try {
      const accessToken = await getPaypalToken();
      // Capture支付
      const captureRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
      });
      const capture = await captureRes.json();
      if (capture.status !== 'COMPLETED') throw new Error('Capture failed: ' + capture.status);
      // 获取custom_id拿到userId和credits
      const customId = capture.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id || '';
      const [userId, credits] = customId.split(':').map(Number);
      if (userId && credits) {
        // 更新积分
        db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').run(credits, userId);
        db.prepare('UPDATE payment_log SET status = ? WHERE paypal_order_id = ?').run('completed', orderId);
      }
      // 重定向到成功页面
      res.writeHead(302, { Location: `${SITE_URL}/profile?payment=success` });
      res.end();
    } catch (e) {
      console.error('PayPal capture error:', e.message);
      res.writeHead(302, { Location: `${SITE_URL}/profile?payment=error` });
      res.end();
    }
    return;
  }

  // 支付取消
  if (req.method === 'GET' && url.pathname === '/api/pay/cancel') {
    const orderId = url.searchParams.get('token');
    if (orderId) db.prepare('UPDATE payment_log SET status = ? WHERE paypal_order_id = ?').run('cancelled', orderId);
    res.writeHead(302, { Location: `${SITE_URL}/pricing?payment=cancel` });
    res.end();
    return;
  }

  // --- Enhance API ---
  if (req.method === 'POST' && url.pathname === '/api/enhance') {
    try {
      const tokenUser = getUserFromReq(req);
      const ip = getClientIp(req);

      // Check usage limits
      let userId = null;
      let limit = LIMITS.anonymous;
      if (tokenUser) {
        userId = tokenUser.userId;
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        if (user.credits > 0) {
          limit = LIMITS.paid;
        } else {
          limit = LIMITS.free;
        }
      }
      const used = getTodayUsage(userId, ip);
      if (used >= limit) {
        // Check if paid user has credits
        if (userId) {
          const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(userId);
          if (user.credits <= 0) {
            res.writeHead(429, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Daily limit reached. Please upgrade for more.', code: 'LIMIT_REACHED' }));
            return;
          }
        } else {
          res.writeHead(429, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Daily limit reached. Sign in for more free uses.', code: 'LIMIT_REACHED' }));
          return;
        }
      }

      // 支持JSON(base64)和multipart两种格式
      let imageData, scale;
      const contentType = req.headers['content-type'] || '';
      
      if (contentType.includes('application/json')) {
        const jsonBody = await collectJSON(req);
        if (!jsonBody.image) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No image provided' }));
          return;
        }
        // 去掉base64头部（data:image/png;base64,xxx）
        const base64Data = jsonBody.image.replace(/^data:image\/\w+;base64,/, '');
        imageData = Buffer.from(base64Data, 'base64');
        scale = Number(jsonBody.scale || 2);
      } else {
        const boundary = getBoundary(contentType);
        if (!boundary) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid content type' }));
          return;
        }
        const body = await collectBody(req, 20 * 1024 * 1024);
        const parts = parseMultipart(body, boundary);
        const imagePart = parts.find(p => p.name === 'image');
        const scalePart = parts.find(p => p.name === 'scale');
        if (!imagePart) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No image provided' }));
          return;
        }
        imageData = imagePart.data;
        scale = Number(scalePart?.value || 2);
      }
      
      const validScale = scale === 4 ? 4 : 2;

      await mkdir(TMP_DIR, { recursive: true });
      const prepId = crypto.randomUUID();
      const rawPath = path.join(TMP_DIR, `${prepId}-raw`);
      const inputPath = path.join(TMP_DIR, `${prepId}-input.png`);
      await writeFile(rawPath, imageData);
      // 自动放大，确保宽高都>=512px（保持比例，只放大不缩小）
      await execFileAsync('convert', [rawPath, '-auto-orient', '-resize', 'x512<', '-resize', '512x<', inputPath], { timeout: 10000 });
      const inputBuffer = await readFile(inputPath);
      await unlink(rawPath).catch(() => {});
      await unlink(inputPath).catch(() => {});

      // 使用阿里云DashScope超分API
      const resultBuffer = await enhanceWithAliyun(inputBuffer, validScale);

      // Log usage & deduct credits
      logUsage(userId, ip, validScale);
      if (userId) {
        const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(userId);
        if (user.credits > 0) {
          db.prepare('UPDATE users SET credits = credits - 1 WHERE id = ?').run(userId);
        }
      }

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
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Enhance API server running on port ${PORT}`);
  console.log(`Google OAuth: ${GOOGLE_CLIENT_ID ? 'configured' : 'not configured (set GOOGLE_CLIENT_ID)'}`);
});
