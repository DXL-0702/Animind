'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/stores/app-store';
import { checkIsAdmin } from '@/lib/auth/supabase-auth';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import LocaleSwitcher from '@/components/ui/LocaleSwitcher';

export default function AppInitializer() {
  const { theme, locale, setUserId, setIsAdmin } = useAppStore();
  const router = useRouter();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('lang', locale);
  }, [theme, locale]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  }, []);

  // Auth state listener + route guard
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    // 初始化：检查当前 session
    supabase.auth.getSession().then(async ({ data: { session } }: { data: { session: Session | null } }) => {
      if (!session) {
        setUserId(null);
        setIsAdmin(false);
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          router.push('/login');
        }
      } else {
        setUserId(session.user.id);
        try {
          const admin = await Promise.race([
            checkIsAdmin(session.user.id),
            new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000))
          ]);
          setIsAdmin(admin);
        } catch {
          setIsAdmin(false);
        }
      }
    }).catch(() => {
      setUserId(null);
      setIsAdmin(false);
    });

    // 监听登录/退出变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        if (!session) {
          setUserId(null);
          setIsAdmin(false);
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            router.push('/login');
          }
        } else {
          setUserId(session.user.id);
          try {
            const admin = await Promise.race([
              checkIsAdmin(session.user.id),
              new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000))
            ]);
            setIsAdmin(admin);
          } catch {
            setIsAdmin(false);
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router, setUserId, setIsAdmin]);

  return (
    <div className="fixed top-3 right-3 z-50 flex items-center gap-1">
      <LocaleSwitcher />
    </div>
  );
}
