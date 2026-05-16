'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 页面加载时：检查 session，若没有则尝试从 URL 消费 recovery token
  useEffect(() => {
    const ensureRecoverySession = async () => {
      try {
        const supabase = getSupabaseBrowserClient();

        // 先检查是否已有有效 session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setCheckingSession(false);
          return;
        }

        // 无 session：从 URL hash / query 中尝试提取 token
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);

        const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
        const code = hashParams.get('code') || queryParams.get('code');
        const tokenHash = hashParams.get('token_hash') || queryParams.get('token_hash');
        const type = hashParams.get('type') || queryParams.get('type');

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else if (tokenHash && type) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as any,
          });
          if (verifyError) throw verifyError;
        } else if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
        } else {
          throw new Error('未检测到有效的重置凭证，请重新申请密码重置邮件');
        }

        // 消费成功后清理 URL hash，避免刷新时重复处理
        if (window.location.hash) {
          history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      } catch (err) {
        console.error('[ResetPassword] Session setup failed:', err);
        setError(err instanceof Error ? err.message : '重置链接无效或已过期');
      } finally {
        setCheckingSession(false);
      }
    };

    ensureRecoverySession();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (password.length < 6) {
      setError('密码至少需要6位');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setMessage('密码已重置成功，正在跳转登录页…');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => router.push('/login'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : '密码重置失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
      <div className="card w-full max-w-sm bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title justify-center text-2xl font-bold mb-2">
            重置密码
          </h2>
          <p className="text-sm opacity-70 text-center mb-4">
            请输入新的管理员登录密码
          </p>

          {checkingSession ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <span className="loading loading-spinner loading-md text-primary" />
              <p className="text-sm opacity-70">正在验证重置凭证…</p>
            </div>
          ) : error && !password ? (
            // 无有效 session 且未开始输入时，展示错误和引导
            <div className="flex flex-col gap-3">
              <div className="alert alert-error py-2 text-sm">
                <span>{error}</span>
              </div>
              <button
                type="button"
                className="btn btn-primary w-full tap-feedback"
                onClick={() => router.push('/login')}
              >
                返回登录页重新申请
              </button>
            </div>
          ) : (
            <form onSubmit={handleReset} className="flex flex-col gap-3">
              <label className="form-control">
                <span className="label-text mb-1">新密码</span>
                <input
                  type="password"
                  className="input input-bordered w-full"
                  placeholder="至少6位"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </label>

              <label className="form-control">
                <span className="label-text mb-1">确认新密码</span>
                <input
                  type="password"
                  className="input input-bordered w-full"
                  placeholder="再次输入新密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </label>

              {error && (
                <div className="alert alert-error py-2 text-sm">
                  <span>{error}</span>
                </div>
              )}

              {message && (
                <div className="alert alert-success py-2 text-sm">
                  <span>{message}</span>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary w-full mt-1 tap-feedback"
                disabled={loading}
              >
                {loading ? <span className="loading loading-spinner loading-sm" /> : '确认重置密码'}
              </button>

              <button
                type="button"
                className="btn btn-ghost btn-sm tap-feedback"
                onClick={() => router.push('/login')}
              >
                返回登录页
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
