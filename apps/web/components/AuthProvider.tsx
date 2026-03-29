'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { AuthContext, SupabaseContext } from '@alpha-stocks/core';
import { createClient } from '@/lib/supabase-browser';
import type { User, Session, SupabaseClient } from '@supabase/supabase-js';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState<SupabaseClient>(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }, [supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }, [supabase]);

  const authValue = useMemo(
    () => ({ user, session, isLoading, signInWithGoogle, signOut }),
    [user, session, isLoading, signInWithGoogle, signOut],
  );

  return (
    <SupabaseContext value={supabase}>
      <AuthContext value={authValue}>
        {children}
      </AuthContext>
    </SupabaseContext>
  );
}
