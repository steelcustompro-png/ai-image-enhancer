'use client';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

const API_BASE = 'https://api.aiimageenhancer.xyz';

const TOKEN_KEY = 'auth_token';

interface User {
  id: number;
  email: string;
  name: string;
  avatar: string;
  plan: string;
  credits?: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  usage: { used: number; limit: number };
  loading: boolean;
  login: (credential: string) => Promise<void>;
  logout: () => void;
  refreshUsage: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null, token: null, usage: { used: 0, limit: 1 },
  loading: true, login: async () => {}, logout: () => {}, refreshUsage: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [usage, setUsage] = useState({ used: 0, limit: 1 });
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const fetchMe = useCallback(async (t: string | null) => {
    try {
      const headers: Record<string, string> = {};
      if (t) headers['Authorization'] = `Bearer ${t}`;
      const res = await fetch(`${API_BASE}/api/auth/me`, { headers });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setUsage(data.usage);
      } else {
        // Token invalid, clear it
        if (t) {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
        }
      }
    } catch (e) {
      console.error('fetchMe error:', e);
    }
    setLoading(false);
  }, []);

  // Initialize on mount
  useEffect(() => {
    if (typeof window === 'undefined' || initialized) return;
    
    // Try to restore token from localStorage
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (savedToken) {
      setToken(savedToken);
      fetchMe(savedToken);
    } else {
      fetchMe(null);
    }
    setInitialized(true);
  }, [fetchMe, initialized]);

  const login = async (credential: string) => {
    const res = await fetch(`${API_BASE}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    });
    if (!res.ok) throw new Error('Login failed');
    const data = await res.json();
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem(TOKEN_KEY, data.token);
    await fetchMe(data.token);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    setUsage({ used: 0, limit: 1 });
    setLoading(false);
  };

  const refreshUsage = async () => fetchMe(token);

  return (
    <AuthContext.Provider value={{ user, token, usage, loading, login, logout, refreshUsage }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
