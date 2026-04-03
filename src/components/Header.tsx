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
    if (!showAuth) return;
    
    const initGoogle = () => {
      if (typeof window === 'undefined' || !(window as any).google) return;
      
      (window as any).googleClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'email profile',
        callback: handleGoogleLogin,
      });
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
  }, [showAuth]);

  const triggerGoogleLogin = () => {
    if ((window as any).googleClient) {
      (window as any).googleClient.requestAccessToken();
    } else {
      setError('Google SDK not loaded');
    }
  };

  const handleGoogleLogin = async (response: any) => {
    if (response.error) {
      setError('Google login cancelled');
      return;
    }
    setSending(true);
    setError('');
    try {
      const credential = response.access_token || response.credential;
      const res = await fetch(`${API_BASE}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
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
          <div className="bg-white rounded-2xl p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6">{isLogin ? 'Sign In' : 'Sign Up'}</h2>
            <div className="space-y-3">
              {/* Google Sign-In Button */}
              <button
                onClick={triggerGoogleLogin}
                disabled={sending}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                title="Sign in with Google"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Continue with Google</span>
              </button>
              
              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500 font-medium">or</span>
                </div>
              </div>

              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">Email</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  className="w-full border rounded-lg px-4 py-3 text-base" 
                  placeholder="your@email.com" 
                />
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">Password</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="w-full border rounded-lg px-4 py-3 text-base" 
                  placeholder="Min 6 characters" 
                />
              </div>
              <button 
                onClick={handleSubmit} 
                disabled={sending} 
                className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-base font-medium"
              >
                {sending ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
              </button>
              {error && <p className="text-red-500 text-base">{error}</p>}
              <p className="text-base text-center text-gray-600">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-indigo-600 hover:underline font-medium">
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </button>
              </p>
            </div>
            <button onClick={() => setShowAuth(false)} className="mt-6 w-full text-base text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
        </div>
      )}
    </header>
  );
}