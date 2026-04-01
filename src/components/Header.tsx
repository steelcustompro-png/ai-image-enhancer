'use client';
import { useState, useRef, useEffect } from 'react';
import { useLang } from '@/lib/lang-context';
import { useAuth } from '@/lib/auth-context';

const API_BASE = 'https://api.aiimageenhancer.xyz';
const GOOGLE_CLIENT_ID = '40946792672-t7tpkouetkucttv0jdnjr9kc2tbh4to6.apps.googleusercontent.com';

export default function Header() {
  const { lang, setLang, t } = useLang();
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Initialize Google Sign-In
  useEffect(() => {
    if (!showAuth || !googleButtonRef.current) return;
    
    const initGoogle = () => {
      if (typeof window === 'undefined' || !(window as any).google) return;
      
      (window as any).google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleLogin,
      });
      
      (window as any).google.accounts.id.renderButton(
        googleButtonRef.current,
        { 
          theme: 'outline', 
          size: 'large', 
          width: googleButtonRef.current?.offsetWidth || 300,
          text: isLogin ? 'signin_with' : 'signup_with',
        }
      );
    };

    // Wait for Google SDK to load
    if ((window as any).google) {
      initGoogle();
    } else {
      const timer = setInterval(() => {
        if ((window as any).google) {
          initGoogle();
          clearInterval(timer);
        }
      }, 100);
      return () => clearInterval(timer);
    }
  }, [showAuth, isLogin]);

  const handleGoogleLogin = async (response: any) => {
    setSending(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Google login failed');
      } else if (data.token) {
        localStorage.setItem('auth_token', data.token);
        setShowAuth(false);
        window.location.reload();
      } else {
        setError('No token received');
      }
    } catch {
      setError('Connection failed');
    }
    setSending(false);
  };

  const handleGitHubLogin = () => {
    const clientId = 'Ov23liVgQfpRbxKvLMuA'; // 临时占位，需要你配置
    const redirectUri = encodeURIComponent(window.location.origin);
    const scope = 'read:user user:email';
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
    
    const popup = window.open(authUrl, 'GitHub Login', 'width=600,height=700');
    
    const checkPopup = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(checkPopup);
        return;
      }
      
      try {
        if (popup.location.href.includes(window.location.origin)) {
          const params = new URLSearchParams(popup.location.search);
          const code = params.get('code');
          if (code) {
            popup.close();
            clearInterval(checkPopup);
            exchangeGitHubCode(code);
          }
        }
      } catch (e) {
        // Cross-origin error, popup still on GitHub
      }
    }, 500);
  };

  const exchangeGitHubCode = async (code: string) => {
    setSending(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'GitHub login failed');
      } else if (data.token) {
        localStorage.setItem('auth_token', data.token);
        setShowAuth(false);
        window.location.reload();
      } else {
        setError('No token received');
      }
    } catch {
      setError('Connection failed');
    }
    setSending(false);
  };

  const handleLinkedInLogin = () => {
    const clientId = 'placeholder'; // 需要配置
    const redirectUri = encodeURIComponent(window.location.origin);
    const scope = 'openid profile email';
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
    
    const popup = window.open(authUrl, 'LinkedIn Login', 'width=600,height=700');
    
    const checkPopup = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(checkPopup);
        return;
      }
      
      try {
        if (popup.location.href.includes(window.location.origin)) {
          const params = new URLSearchParams(popup.location.search);
          const code = params.get('code');
          if (code) {
            popup.close();
            clearInterval(checkPopup);
            exchangeLinkedInCode(code);
          }
        }
      } catch (e) {
        // Cross-origin error
      }
    }, 500);
  };

  const exchangeLinkedInCode = async (code: string) => {
    setSending(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/linkedin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'LinkedIn login failed');
      } else if (data.token) {
        localStorage.setItem('auth_token', data.token);
        setShowAuth(false);
        window.location.reload();
      } else {
        setError('No token received');
      }
    } catch {
      setError('Connection failed');
    }
    setSending(false);
  };

  const handleFacebookLogin = () => {
    if (!(window as any).FB) {
      setError('Facebook SDK not loaded');
      return;
    }
    
    (window as any).FB.login((response: any) => {
      if (response.authResponse) {
        exchangeFacebookToken(response.authResponse.accessToken);
      } else {
        setError('Facebook login cancelled');
      }
    }, { scope: 'public_profile,email' });
  };

  const exchangeFacebookToken = async (accessToken: string) => {
    setSending(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/facebook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Facebook login failed');
      } else if (data.token) {
        localStorage.setItem('auth_token', data.token);
        setShowAuth(false);
        window.location.reload();
      } else {
        setError('No token received');
      }
    } catch {
      setError('Connection failed');
    }
    setSending(false);
  };

  const handleSubmit = async () => {
    if (!email || !password) { setError('Email and password required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    
    setSending(true);
    setError('');
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { 
        setError(data.error || 'Login failed'); 
      } else if (data.token) {
        localStorage.setItem('auth_token', data.token);
        setShowAuth(false);
        window.location.href = window.location.href;
      } else {
        setError('No token received');
      }
    } catch { 
      setError('Connection failed'); 
    }
    setSending(false);
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/" className="text-xl font-bold text-indigo-600">AI Image Enhancer</a>
        </div>
        <div className="flex items-center gap-4">
          <select value={lang} onChange={e => setLang(e.target.value as any)} className="text-sm border rounded px-2 py-1">
            <option value="en">EN</option>
            <option value="zh">中文</option>
          </select>
          {!loading && !user && (
            <button onClick={() => { setEmail(''); setPassword(''); setError(''); setIsLogin(true); setShowAuth(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
              {t('nav_login')}
            </button>
          )}
          {!loading && user && (
            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenuOpen(!menuOpen)}>
                {user.avatar ? <img src={user.avatar} alt="" className="w-8 h-8 rounded-full" /> :
                  <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">{user.email[0].toUpperCase()}</div>}
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border py-2">
                  <div className="px-4 py-2 border-b">
                    <p className="text-sm font-medium">{user.email}</p>
                    <p className="text-xs font-bold text-indigo-600">Credits: {user.credits ?? 0}</p>
                  </div>
                  <a href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">{lang === 'zh' ? '个人中心' : 'My Profile'}</a>
                  <button onClick={() => { localStorage.removeItem('auth_token'); logout(); setMenuOpen(false); window.location.reload(); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    {lang === 'zh' ? '退出登录' : 'Sign Out'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showAuth && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAuth(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">{isLogin ? 'Sign In' : 'Sign Up'}</h2>
            <div className="space-y-4">
              {/* Google Sign-In Button */}
              <div ref={googleButtonRef} className="w-full"></div>
              
              {/* Other OAuth Providers */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handleGitHubLogin}
                  disabled={sending}
                  className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  title="Sign in with GitHub"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
                  </svg>
                </button>
                
                <button
                  onClick={handleLinkedInLogin}
                  disabled={sending}
                  className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  title="Sign in with LinkedIn"
                >
                  <svg className="w-5 h-5" fill="#0A66C2" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </button>
                
                <button
                  onClick={handleFacebookLogin}
                  disabled={sending}
                  className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  title="Sign in with Facebook"
                >
                  <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </button>
              </div>
              
              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with email</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  className="w-full border rounded-lg px-3 py-2" 
                  placeholder="your@email.com" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="w-full border rounded-lg px-3 py-2" 
                  placeholder="Min 6 characters" 
                />
              </div>
              <button 
                onClick={handleSubmit} 
                disabled={sending} 
                className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {sending ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
              </button>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <p className="text-sm text-center text-gray-600">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-indigo-600 hover:underline">
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </button>
              </p>
            </div>
            <button onClick={() => setShowAuth(false)} className="mt-4 w-full text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
        </div>
      )}
    </header>
  );
}