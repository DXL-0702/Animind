'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAppStore } from '@/stores/app-store';

export default function AuthCallbackPage() {
  const router = useRouter();
  const setUserId = useAppStore((s) => s.setUserId);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const supabase = getSupabaseBrowserClient();

        // 从 URL 中获取 token（支持 hash 和 query 两种模式）
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);

        const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
        const tokenHash = hashParams.get('token_hash') || queryParams.get('token_hash');
        const code = hashParams.get('code') || queryParams.get('code');
        const type = hashParams.get('type') || queryParams.get('type');

        console.log('[AuthCallback] Processing auth callback', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          hasTokenHash: !!tokenHash,
          hasCode: !!code,
          type
        });

        const isRecovery = type === 'recovery';

        // 如果有 code（PKCE authorization code flow），交换 session
        if (code) {
          console.log('[AuthCallback] Code flow detected, exchanging code for session');
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error('[AuthCallback] Code exchange failed:', exchangeError);
            throw exchangeError;
          }

          console.log('[AuthCallback] Code exchanged successfully:', data.session?.user?.id);
          if (data.session?.user?.id) setUserId(data.session.user.id);
        }
        // 如果有 token_hash（OTP flow），验证 OTP
        else if (tokenHash && type) {
          console.log('[AuthCallback] PKCE flow detected, verifying OTP');
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as any,
          });

          if (verifyError) {
            console.error('[AuthCallback] OTP verification failed:', verifyError);
            throw verifyError;
          }

          console.log('[AuthCallback] OTP verified successfully:', data.session?.user?.id);
          if (data.session?.user?.id) setUserId(data.session.user.id);
        }
        // 如果有 access_token（传统 magic link），设置 session
        else if (accessToken && refreshToken) {
          console.log('[AuthCallback] Setting session from tokens');
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('[AuthCallback] Session setup failed:', sessionError);
            throw sessionError;
          }

          console.log('[AuthCallback] Session set successfully:', data.session?.user?.id);
          if (data.session?.user?.id) setUserId(data.session.user.id);
        } else {
          throw new Error('No valid auth tokens found in URL');
        }

        setStatus('success');

        // 等待一下让 session 完全建立，然后跳转
        setTimeout(() => {
          if (isRecovery) {
            console.log('[AuthCallback] Redirecting to reset password');
            router.push('/reset-password');
          } else {
            console.log('[AuthCallback] Redirecting to home');
            router.push('/');
          }
        }, 500);

      } catch (err) {
        console.error('[AuthCallback] Error:', err);
        setStatus('error');
        setError(err instanceof Error ? err.message : '登录失败');

        // 3秒后跳转回登录页
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card w-full max-w-sm bg-base-100 shadow-xl">
        <div className="card-body items-center text-center">
          {status === 'loading' && (
            <>
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <h2 className="card-title mt-4">正在登录...</h2>
              <p className="text-sm opacity-70">请稍候</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="text-6xl mb-4">✓</div>
              <h2 className="card-title text-success">验证成功！</h2>
              <p className="text-sm opacity-70">正在跳转...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="text-6xl mb-4">✗</div>
              <h2 className="card-title text-error">登录失败</h2>
              <p className="text-sm opacity-70">{error}</p>
              <p className="text-xs opacity-50 mt-2">3秒后返回登录页</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
