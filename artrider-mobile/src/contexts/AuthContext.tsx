import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/services/supabase';
import { signIn, signUp, type SignInParams, type SignUpParams, type AuthResult } from '@/services/authService';

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
};

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (params: SignInParams) => Promise<AuthResult>;
  register: (params: SignUpParams) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name, phone, avatar_url')
      .eq('id', userId)
      .single();
    setProfile((data as Profile) ?? null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
  }

  async function refreshProfile() {
    if (session?.user) await fetchProfile(session.user.id);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        isAuthenticated: !!session,
        login: signIn,
        register: signUp,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}