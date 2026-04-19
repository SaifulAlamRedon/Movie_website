import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { adminTokenStorage, authApi } from '../services/api';
import type { AdminProfile } from '../types';

interface AdminAuthContextValue {
  admin: AdminProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  signup: (payload: {
    name: string;
    email: string;
    password: string;
    signupKey: string;
    avatarUrl?: string;
  }) => Promise<void>;
  logout: () => void;
  refreshAdmin: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAdmin = async () => {
    const token = adminTokenStorage.get();

    if (!token) {
      setAdmin(null);
      setLoading(false);
      return;
    }

    try {
      const profile = await authApi.me();
      setAdmin(profile);
    } catch {
      adminTokenStorage.clear();
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshAdmin();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    const response = await authApi.login(credentials);
    adminTokenStorage.set(response.token);
    setAdmin(response.admin);
  };

  const signup = async (payload: {
    name: string;
    email: string;
    password: string;
    signupKey: string;
    avatarUrl?: string;
  }) => {
    const response = await authApi.signup(payload);
    adminTokenStorage.set(response.token);
    setAdmin(response.admin);
  };

  const logout = () => {
    adminTokenStorage.clear();
    setAdmin(null);
  };

  const value = useMemo<AdminAuthContextValue>(() => ({
    admin,
    loading,
    isAuthenticated: Boolean(admin),
    login,
    signup,
    logout,
    refreshAdmin,
  }), [admin, loading]);

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);

  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }

  return context;
}
