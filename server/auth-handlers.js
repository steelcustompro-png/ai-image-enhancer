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

// GitHub 登录
async function handleGitHubLogin(db, code) {
  try {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    
    // 1. Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code })
    });
    
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return { error: 'Failed to get GitHub access token' };
    }
    
    // 2. Get user info
    const userRes = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });
    const userData = await userRes.json();
    
    const github_id = String(userData.id);
    const email = userData.email || `${userData.login}@github.placeholder`;
    
    // 3. Find or create user
    let user = db.prepare('SELECT * FROM users WHERE github_id = ? OR email = ?').get(github_id, email);
    
    if (!user) {
      const result = db.prepare(
        'INSERT INTO users (email, github_id, name, avatar, credits, plan) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(email, github_id, userData.name || userData.login, userData.avatar_url, 3, 'free');
      user = { id: result.lastInsertRowid, email, credits: 3, plan: 'free' };
    } else if (!user.github_id) {
      db.prepare('UPDATE users SET github_id = ?, avatar = ? WHERE id = ?')
        .run(github_id, userData.avatar_url, user.id);
    }
    
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
    return { token, user: { id: user.id, email: user.email, credits: user.credits, plan: user.plan } };
  } catch (error) {
    console.error('GitHub auth error:', error);
    return { error: 'GitHub authentication failed' };
  }
}

// LinkedIn 登录
async function handleLinkedInLogin(db, code) {
  try {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI || 'https://aiimageenhancer.xyz';
    
    // 1. Exchange code for access token
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
      })
    });
    
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return { error: 'Failed to get LinkedIn access token' };
    }
    
    // 2. Get user info
    const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });
    const userData = await userRes.json();
    
    const linkedin_id = userData.sub;
    const email = userData.email;
    
    // 3. Find or create user
    let user = db.prepare('SELECT * FROM users WHERE linkedin_id = ? OR email = ?').get(linkedin_id, email);
    
    if (!user) {
      const result = db.prepare(
        'INSERT INTO users (email, linkedin_id, name, avatar, credits, plan) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(email, linkedin_id, userData.name, userData.picture, 3, 'free');
      user = { id: result.lastInsertRowid, email, credits: 3, plan: 'free' };
    } else if (!user.linkedin_id) {
      db.prepare('UPDATE users SET linkedin_id = ?, avatar = ? WHERE id = ?')
        .run(linkedin_id, userData.picture, user.id);
    }
    
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
    return { token, user: { id: user.id, email: user.email, credits: user.credits, plan: user.plan } };
  } catch (error) {
    console.error('LinkedIn auth error:', error);
    return { error: 'LinkedIn authentication failed' };
  }
}

// Facebook 登录
async function handleFacebookLogin(db, accessToken) {
  try {
    // Verify and get user info
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    
    const userRes = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`);
    const userData = await userRes.json();
    
    if (userData.error) {
      return { error: 'Invalid Facebook token' };
    }
    
    const facebook_id = userData.id;
    const email = userData.email || `${facebook_id}@facebook.placeholder`;
    
    // Find or create user
    let user = db.prepare('SELECT * FROM users WHERE facebook_id = ? OR email = ?').get(facebook_id, email);
    
    if (!user) {
      const result = db.prepare(
        'INSERT INTO users (email, facebook_id, name, avatar, credits, plan) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(email, facebook_id, userData.name, userData.picture?.data?.url, 3, 'free');
      user = { id: result.lastInsertRowid, email, credits: 3, plan: 'free' };
    } else if (!user.facebook_id) {
      db.prepare('UPDATE users SET facebook_id = ?, avatar = ? WHERE id = ?')
        .run(facebook_id, userData.picture?.data?.url, user.id);
    }
    
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
    return { token, user: { id: user.id, email: user.email, credits: user.credits, plan: user.plan } };
  } catch (error) {
    console.error('Facebook auth error:', error);
    return { error: 'Facebook authentication failed' };
  }
}

module.exports = { 
  handleRegister, 
  handleLogin, 
  handleGoogleLogin,
  handleGitHubLogin,
  handleLinkedInLogin,
  handleFacebookLogin,
  JWT_SECRET 
};
