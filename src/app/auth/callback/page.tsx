'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();
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
        const tokenHash = queryParams.get('token_hash');
        const type = queryParams.get('type');

        console.log('[AuthCallback] Processing auth callback', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          hasTokenHash: !!tokenHash,
          type
        });

        // 如果有 token_hash（PKCE flow），让 Supabase 自动处理
        if (tokenHash && type) {
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
        } else {
          throw new Error('No valid auth tokens found in URL');
        }

        setStatus('success');

        // 等待一下让 session 完全建立，然后跳转
        setTimeout(() => {
          console.log('[AuthCallback] Redirecting to home');
          router.push('/');
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
              <h2 className="card-title text-success">登录成功！</h2>
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
