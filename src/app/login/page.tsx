'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithOTP, signInWithPassword, verifyOTP } from '@/lib/auth/supabase-auth';

type LoginMode = 'user' | 'admin';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUserLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signInWithOTP(email);
      setEmailSent(true);
      setError('登录链接已发送到您的邮箱，请点击邮件中的链接完成登录');
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signInWithPassword(email, password);
      router.push('/admin');
    } catch (err) {
      console.error('❌ [LoginPage] 管理员登录失败:', err);
      const msg = err instanceof Error ? err.message : '管理员登录失败，请检查邮箱和密码';
      setError(msg);
      setLoading(false);
      // 延迟 signOut，让错误信息先显示，避免触发 AppInitializer 重定向循环
      setTimeout(async () => {
        try {
          const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
          await getSupabaseBrowserClient().auth.signOut();
        } catch { /* ignore */ }
      }, 100);
      return;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card w-full max-w-sm bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title justify-center text-2xl font-bold mb-2">
            Animind
          </h2>

          {/* 用户/管理员切换 */}
          <div className="tabs tabs-boxed mb-4">
            <button
              className={`tab flex-1 ${mode === 'user' ? 'tab-active' : ''}`}
              onClick={() => {
                setMode('user');
                setError(null);
                setEmailSent(false);
              }}
            >
              我是用户
            </button>
            <button
              className={`tab flex-1 ${mode === 'admin' ? 'tab-active' : ''}`}
              onClick={() => {
                setMode('admin');
                setError(null);
                setEmailSent(false);
              }}
            >
              我是管理员
            </button>
          </div>

          {/* 用户登录表单 */}
          {mode === 'user' && (
            <form onSubmit={handleUserLogin} className="flex flex-col gap-3">
              <label className="form-control">
                <span className="label-text mb-1">邮箱</span>
                <input
                  type="email"
                  className="input input-bordered w-full"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={emailSent}
                  autoComplete="email"
                />
              </label>

              {error && (
                <div className={`alert ${emailSent && !error.includes('失败') ? 'alert-success' : 'alert-error'} py-2 text-sm`}>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary w-full mt-1"
                disabled={loading || emailSent}
              >
                {loading ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : emailSent ? (
                  '已发送，请查收邮件'
                ) : (
                  '发送登录链接'
                )}
              </button>

              {emailSent && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setEmailSent(false);
                    setError(null);
                  }}
                >
                  重新发送
                </button>
              )}
            </form>
          )}

          {/* 管理员登录表单 */}
          {mode === 'admin' && (
            <form onSubmit={handleAdminLogin} className="flex flex-col gap-3">
              <label className="form-control">
                <span className="label-text mb-1">管理员邮箱</span>
                <input
                  type="email"
                  className="input input-bordered w-full"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </label>

              <label className="form-control">
                <span className="label-text mb-1">管理员密码</span>
                <input
                  type="password"
                  className="input input-bordered w-full"
                  placeholder="请输入管理员密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="current-password"
                />
              </label>

              {error && (
                <div className="alert alert-error py-2 text-sm">
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary w-full mt-1"
                disabled={loading}
              >
                {loading ? <span className="loading loading-spinner loading-sm" /> : '管理员登录'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
