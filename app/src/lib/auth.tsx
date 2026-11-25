import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, type TaiKhoan } from './supabase';

type Ctx = {
  session: Session | null;
  me: TaiKhoan | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<TaiKhoan | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadMe(s: Session | null) {
    if (!s) { setMe(null); setLoading(false); return; }
    const { data } = await supabase
      .from('tai_khoan')
      .select('id,email,trang_thai,la_quan_tri,vai_tro')
      .eq('id', s.user.id)
      .maybeSingle();
    setMe((data as TaiKhoan) ?? null);
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); loadMe(data.session); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); loadMe(s); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: Ctx = {
    session,
    me,
    loading,
    signIn: async () => {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/phuongntk/tra-cuu/',
          queryParams: { hd: 'daidung.vn', prompt: 'select_account' },
        },
      });
    },
    signOut: async () => { await supabase.auth.signOut(); },
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error('useAuth phải nằm trong AuthProvider');
  return c;
}
