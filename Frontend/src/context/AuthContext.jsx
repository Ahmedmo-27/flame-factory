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
    const res = await loginApi(email, password);
    const { token, user: u } = res.data;
    localStorage.setItem('ff_token', token);
    localStorage.setItem('ff_user', JSON.stringify(u));
    setUser(u);
    return u;
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
