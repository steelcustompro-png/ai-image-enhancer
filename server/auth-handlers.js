const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const { OAuth2Client } = require('google-auth-library');

const JWT_SECRET = "ai-image-enhancer-jwt-secret-2024";
const GOOGLE_CLIENT_ID = "40946792672-t7tpkouetkucttv0jdnjr9kc2tbh4to6.apps.googleusercontent.com";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// 密码哈希
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// 注册
function handleRegister(db, email, password) {
  if (!email || !password || password.length < 6) {
    return { error: 'Email and password (min 6 chars) required' };
  }
  
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return { error: 'Email already registered' };
  }
  
  const hashedPassword = hashPassword(password);
  const result = db.prepare(
    'INSERT INTO users (email, password, google_id, credits, plan) VALUES (?, ?, ?, ?, ?)'
  ).run(email, hashedPassword, 'email_' + crypto.randomUUID(), 3, 'free');
  
  const user = { id: result.lastInsertRowid, email, credits: 3, plan: 'free' };
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
  
  return { token, user };
}

// 登录
function handleLogin(db, email, password) {
  if (!email || !password) {
    return { error: 'Email and password required' };
  }
  
  const hashedPassword = hashPassword(password);
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND password = ?').get(email, hashedPassword);
  
  if (!user) {
    return { error: 'Invalid email or password' };
  }
  
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
  
  return { token, user: { id: user.id, email: user.email, credits: user.credits, plan: user.plan } };
}

// Google 登录
async function handleGoogleLogin(db, credential) {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: google_id, email } = payload;
    
    // 检查用户是否存在
    let user = db.prepare('SELECT * FROM users WHERE email = ? OR google_id = ?').get(email, google_id);
    
    if (!user) {
      // 自动注册新用户
      const result = db.prepare(
        'INSERT INTO users (email, google_id, credits, plan) VALUES (?, ?, ?, ?)'
      ).run(email, google_id, 3, 'free');
      user = { id: result.lastInsertRowid, email, credits: 3, plan: 'free' };
    } else if (!user.google_id || user.google_id.startsWith('email_')) {
      // 如果是用邮箱注册的，绑定 Google ID
      db.prepare('UPDATE users SET google_id = ? WHERE id = ?').run(google_id, user.id);
    }
    
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
    return { token, user: { id: user.id, email: user.email, credits: user.credits, plan: user.plan } };
  } catch (error) {
    console.error('Google auth error:', error);
    return { error: 'Invalid Google credential' };
  }
}

module.exports = { handleRegister, handleLogin, handleGoogleLogin, JWT_SECRET };
