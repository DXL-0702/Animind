-- ============================================================
-- 修复 RLS 无限递归 (error 42P17)
-- 执行时间: 2026-03-22
-- 说明: 将 is_admin() 和 get_my_role() 改为 plpgsql，拆分 users 表 RLS 策略
-- ============================================================

-- 1. 修复 is_admin() - 改为 plpgsql 防止内联
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- 2. 修复 get_my_role() - 改为 plpgsql 防止内联
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.users WHERE id = auth.uid() LIMIT 1;
  RETURN v_role;
END;
$$;

-- 3. 修复 handle_new_user() - 添加 search_path 安全配置
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, nickname, role, created_at, updated_at)
  VALUES (NEW.id, '', 'user', (extract(epoch from now()) * 1000)::bigint, (extract(epoch from now()) * 1000)::bigint)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 4. 拆分 users 表 RLS 策略（避免递归）
DROP POLICY IF EXISTS "own_data" ON public.users;
DROP POLICY IF EXISTS "users_self_access" ON public.users;
DROP POLICY IF EXISTS "users_admin_access" ON public.users;

-- 普通用户：只能访问自己的行（纯表达式，零递归风险）
CREATE POLICY "users_self_access" ON public.users FOR ALL USING (
  auth.uid() = id
);

-- 管理员：可查看所有用户（is_admin() 现在是 plpgsql，不会被内联递归）
CREATE POLICY "users_admin_access" ON public.users FOR SELECT USING (
  public.is_admin()
);

-- ============================================================
-- 5. 创建 Storage Bucket + 访问策略（立绘图片存储）
-- ============================================================

-- 创建 character-images bucket（public，允许通过 URL 直接访问）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'character-images',
  'character-images',
  true,
  10485760,  -- 10MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];

-- Storage RLS 策略：用户只能操作自己目录下的文件
-- 路径格式: {userId}/{characterId}.png

-- 上传/更新：用户只能写入自己的目录
DROP POLICY IF EXISTS "users_upload_own_images" ON storage.objects;
CREATE POLICY "users_upload_own_images" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'character-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "users_update_own_images" ON storage.objects;
CREATE POLICY "users_update_own_images" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'character-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 读取：public bucket，所有人可读
DROP POLICY IF EXISTS "public_read_character_images" ON storage.objects;
CREATE POLICY "public_read_character_images" ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'character-images');

-- 删除：用户只能删除自己的图片
DROP POLICY IF EXISTS "users_delete_own_images" ON storage.objects;
CREATE POLICY "users_delete_own_images" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'character-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- 迁移完成
-- 验证步骤:
-- 1. 用户 OTP 登录 → 首页加载角色列表 → 不再报 42P17
-- 2. OC 生成器 → 保存角色 → 成功写入 Storage
-- 3. 首页侧边栏 → 显示角色立绘
-- 4. 管理员密码登录 → /admin 页面正常加载
-- ============================================================
