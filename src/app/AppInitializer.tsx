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

    // 检查 URL 中是否有 magic link token（避免在验证完成前重定向）
    const isAuthCallback = typeof window !== 'undefined' && (
      window.location.hash.includes('access_token') ||
      window.location.hash.includes('type=magiclink') ||
      window.location.search.includes('token_hash')
    );

    // 初始化：检查当前 session
    supabase.auth.getSession().then(async ({ data: { session } }: { data: { session: Session | null } }) => {
      if (!session) {
        setUserId(null);
        setIsAdmin(false);
        // 如果是 auth callback，不要重定向，等待 onAuthStateChange 处理
        if (!isAuthCallback && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          router.push('/login');
        }
      } else {
        // 立即设置 userId，不等待 admin 检查完成
        setUserId(session.user.id);
        // 异步检查管理员权限，不阻塞 UI
        Promise.race([
          checkIsAdmin(session.user.id),
          new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000))
        ]).then(admin => {
          setIsAdmin(admin);
        }).catch(() => {
          setIsAdmin(false);
        });

        // 如果是 auth callback，清理 URL 并跳转到首页
        if (isAuthCallback && typeof window !== 'undefined') {
          window.history.replaceState({}, document.title, '/');
          router.push('/');
        }
      }
    }).catch(() => {
      setUserId(null);
      setIsAdmin(false);
    });

    // 监听登录/退出变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log('[Auth] State change:', event, session?.user?.id);

        if (!session) {
          setUserId(null);
          setIsAdmin(false);
          // SIGNED_OUT 事件才重定向到登录页，避免在 magic link 验证过程中误重定向
          if (event === 'SIGNED_OUT' && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            router.push('/login');
          }
        } else {
          // 立即设置 userId，不等待 admin 检查完成
          setUserId(session.user.id);
          // 异步检查管理员权限，不阻塞 UI
          Promise.race([
            checkIsAdmin(session.user.id),
            new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000))
          ]).then(admin => {
            setIsAdmin(admin);
          }).catch(() => {
            setIsAdmin(false);
          });

          // 如果是 magic link 登录成功，跳转到首页
          if (event === 'SIGNED_IN' && typeof window !== 'undefined' && window.location.pathname === '/login') {
            router.push('/');
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
