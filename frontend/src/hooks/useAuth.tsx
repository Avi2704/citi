import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile, UserRole } from '../types';

type AuthContextType = {
  token: string | null;
  profile: Profile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const getRoleFromEmail = (email: string): UserRole => {
  if (email.includes('admin')) return 'admin';
  if (email.includes('staff')) return 'collection_staff';
  return 'citizen';
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (session?.access_token && session.user.email) {
        setToken(session.access_token);
        setProfile({
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata.full_name ?? null,
          role: getRoleFromEmail(session.user.email),
        });
      }
      setLoading(false);
    };

    bootstrap();
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session || !data.user.email) throw new Error(error?.message ?? 'Login failed');

    setToken(data.session.access_token);
    setProfile({
      id: data.user.id,
      email: data.user.email,
      full_name: data.user.user_metadata.full_name ?? null,
      role: getRoleFromEmail(data.user.email),
    });
  };

  const register = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    if (error || !data.user) throw new Error(error?.message ?? 'Registration failed');
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setToken(null);
    setProfile(null);
  };

  const value = useMemo(
    () => ({ token, profile, loading, login, register, logout }),
    [loading, profile, token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};
