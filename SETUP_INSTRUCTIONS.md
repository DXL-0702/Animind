# 登录系统修复 - 完成步骤

## ✅ 已完成的代码修改

所有代码修改已在本次会话中实施完毕：

1. ✅ 添加了 `get_my_role()` SQL 函数到 `supabase/init.sql`
2. ✅ 修复了管理员登录流程中的错误处理
3. ✅ 停止了旧的 dev server
4. ✅ 重新启动了 dev server

---

## 📋 你需要完成的步骤

### 步骤 1: 在 Supabase SQL Editor 执行以下 SQL

访问你的 Supabase 项目 → SQL Editor → 新建查询，执行以下 SQL：

```sql
-- 创建 get_my_role() 函数（如果还没有）
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

-- 确认 is_admin() 函数存在
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;
```

### 步骤 2: 设置管理员账号（如果需要）

如果你还没有管理员账号，在 SQL Editor 执行：

```sql
-- 将指定邮箱设置为管理员
SELECT public.set_admin_by_email('your@email.com');
```

**注意**: 替换 `your@email.com` 为你的实际邮箱地址。

### 步骤 3: 清除浏览器缓存

在浏览器中：
1. 打开开发者工具 (F12)
2. Application/应用 → Storage/存储
3. 清除以下内容：
   - Local Storage
   - Session Storage
   - Cookies (特别是 Supabase 相关的)

或者直接使用隐私模式/无痕模式测试。

### 步骤 4: 测试登录

1. 访问 http://localhost:3000/login
2. 测试用户登录（OTP 模式）
3. 测试管理员登录（密码模式）

---

## 🔍 验证检查清单

- [ ] SQL 函数已创建（`get_my_role()` 和 `is_admin()`）
- [ ] 管理员账号已设置
- [ ] 浏览器缓存已清除
- [ ] Dev server 正在运行（http://localhost:3000）
- [ ] 用户登录正常工作
- [ ] 管理员登录正常工作
- [ ] 管理员可以访问 /admin 页面

---

## 🐛 如果还有问题

### 问题 1: "该账号不是管理员账号"

**解决方案**: 在 Supabase SQL Editor 执行：
```sql
SELECT public.set_admin_by_email('your@email.com');
```

### 问题 2: "验证超时：查询 users 表超过 10 秒"

**可能原因**: RLS 策略配置问题

**解决方案**: 确认 `is_admin()` 函数使用了 `SECURITY DEFINER`，这样可以绕过 RLS。

### 问题 3: 登录后立即退出

**解决方案**:
1. 清除浏览器所有 Supabase 相关的 cookies
2. 检查 `.env.local` 中的 Supabase URL 和 ANON_KEY 是否正确
3. 重启 dev server

---

## 📝 技术说明

### 修复的核心问题

1. **缺失的 SQL 函数**: 代码调用 `get_my_role()` 但该函数不存在
2. **错误处理时机**: 管理员验证失败时过早调用 `signOut()`，导致错误信息无法显示

### 关键代码变更

- `supabase/init.sql:176-186` - 添加了 `get_my_role()` 函数
- `src/lib/auth/supabase-auth.ts:70-86` - 修复了错误处理流程

---

**最后更新**: 2026-03-22
