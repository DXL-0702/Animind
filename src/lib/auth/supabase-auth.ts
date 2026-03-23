import { getSupabaseBrowserClient } from '@/lib/supabase/client';

// 用户邮箱 Magic Link 登录 - 使用 PKCE flow 提高兼容性
export async function signInWithOTP(email: string) {
  const supabase = getSupabaseBrowserClient();

  // 获取当前域名作为 redirect URL
  const redirectTo = typeof window !== 'undefined'
    ? `${window.location.origin}/auth/callback`
    : undefined;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      // 使用 PKCE flow，更安全且兼容性更好
      emailRedirectTo: redirectTo,
    },
  });
  if (error) throw error;
}

// 用户邮箱验证码登录 - 验证 OTP
export async function verifyOTP(email: string, token: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });
  if (error) throw error;
  return data.session;
}

// 管理员密码登录
export async function signInWithPassword(email: string, password: string) {
  const supabase = getSupabaseBrowserClient();

  console.log('✅ [Auth] 管理员登录尝试:', email);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('❌ [Auth] signInWithPassword 失败:', error);
    if (error.message.includes('Email not confirmed')) {
      throw new Error('邮箱未确认，请在 Supabase Dashboard 手动确认管理员邮箱');
    }
    if (error.message.includes('Invalid login credentials')) {
      throw new Error('邮箱或密码错误');
    }
    throw error;
  }

  if (!data.user) {
    throw new Error('登录失败，未获取到用户信息');
  }

  console.log('✅ [Auth] 密码验证成功, userId:', data.user.id);

  // 验证是否为管理员（添加超时保护）
  console.log('🔍 [Auth] 开始验证管理员权限...');

  try {
    const isAdmin = await Promise.race([
      checkIsAdmin(data.user.id),
      new Promise<boolean>((_, reject) =>
        setTimeout(() => reject(new Error('验证超时：查询 users 表超过 10 秒，可能是 RLS 策略问题')), 10000)
      )
    ]);

    console.log('📥 [Auth] 管理员检查结果:', isAdmin);

    if (!isAdmin) {
      // 关键修复：先抛出错误，让 UI 显示，不要立即 signOut
      throw new Error(
        `该账号不是管理员账号\n\n` +
        `请在 Supabase SQL Editor 执行以下命令设置管理员权限：\n` +
        `SELECT public.set_admin_by_email('${email}');`
      );
    }

    console.log('🚀 [Auth] 验证通过，准备跳转到管理后台');
    return data.session;

  } catch (err) {
    console.error('❌ [Auth] 管理员验证失败:', err);

    // 关键修复：先抛出错误让 UI 显示，然后由 UI 决定是否 signOut
    // 不要在这里 signOut，否则会触发页面重定向，错误信息来不及显示
    throw err;
  }
}

export async function getCurrentUser() {
  const supabase = getSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function logout() {
  const supabase = getSupabaseBrowserClient();
  await supabase.auth.signOut();
}

export async function checkIsAdmin(userId: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();

  // 方案1：RPC 调用（SECURITY DEFINER，绕过 RLS）
  try {
    const { data, error } = await supabase.rpc('get_my_role');
    if (!error && data) {
      return data === 'admin';
    }
  } catch {}

  // 方案2：直接查表（可能受 RLS 影响）
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    if (!error && data) {
      return data.role === 'admin';
    }
  } catch {}

  return false;
}
