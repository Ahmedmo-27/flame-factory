import { createContext, useContext, useState, useCallback } from 'react';
import { login as loginApi } from '../api/endpoints';

const AuthContext = createContext(null);

function parseUser() {
  try {
    const raw = localStorage.getItem('ff_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(parseUser);

  const signIn = useCallback(async (email, password) => {
    const apiUrl = import.meta.env.VITE_API_URL;
    console.info('[auth] Login attempt', {
      apiUrl: apiUrl || '(missing VITE_API_URL)',
      email: email?.trim(),
      passwordLength: password?.length ?? 0,
    });

    try {
      const res = await loginApi(email, password);
      const { token, user: u } = res.data;
      localStorage.setItem('ff_token', token);
      localStorage.setItem('ff_user', JSON.stringify(u));
      setUser(u);
      console.info('[auth] Login success', { role: u.role, email: u.email });
      return u;
    } catch (err) {
      console.error('[auth] Login failed', {
        apiUrl: apiUrl || '(missing VITE_API_URL)',
        status: err.response?.status,
        message: err.response?.data?.message,
        networkError: !err.response ? err.message : null,
        requestUrl: err.config?.baseURL
          ? `${err.config.baseURL}${err.config.url}`
          : err.config?.url,
      });
      throw err;
    }
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem('ff_token');
    localStorage.removeItem('ff_user');
    setUser(null);
  }, []);

  // Refresh user from storage (e.g. after profile update)
  const refreshUser = useCallback(() => {
    setUser(parseUser());
  }, []);

  return (
    <AuthContext.Provider value={{ user, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
