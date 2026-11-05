import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

// Menyimpan data user yang login & menyediakannya ke seluruh aplikasi
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true); // sedang cek sesi saat halaman pertama dibuka

  // Saat aplikasi dibuka/di-refresh: tanya backend "siapa aku?"
  useEffect(() => {
    api.get('/auth/me')
      .then((res) => setUser(res.data.data))
      .catch(() => setUser(null)) // 401 = belum login, itu normal
      .finally(() => setChecking(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    setUser(res.data.data);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, checking, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook: cukup panggil useAuth() di komponen mana pun
export function useAuth() {
  return useContext(AuthContext);
}
