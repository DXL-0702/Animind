-- ============================================================
-- Animind Supabase 初始化 SQL (幂等安全版)
-- 无论运行多少次，都不会报错，且能确保最新配置生效
-- ============================================================

-- 1. 启用扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- 2. 建表（7 张）- 增加 IF NOT EXISTS
-- ============================================================

-- users（auth trigger 自动创建行）
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  deleted_at BIGINT
);

-- characters
CREATE TABLE IF NOT EXISTS public.characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  personality TEXT NOT NULL DEFAULT '{}',
  appearance TEXT NOT NULL DEFAULT '{}',
  backstory TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  voice_id TEXT NOT NULL DEFAULT 'BV700_V2_streaming',
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  deleted_at BIGINT
);
CREATE INDEX IF NOT EXISTS idx_characters_user ON public.characters(user_id) WHERE deleted_at IS NULL;

-- messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  emotion TEXT,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  deleted_at BIGINT
);
CREATE INDEX IF NOT EXISTS idx_messages_character ON public.messages(character_id) WHERE deleted_at IS NULL;

-- memories（含 pgvector）
CREATE TABLE IF NOT EXISTS public.memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  facts TEXT[] NOT NULL DEFAULT '{}',
  importance REAL NOT NULL DEFAULT 0,
  embedding vector(1024),
  access_count INTEGER NOT NULL DEFAULT 0,
  last_accessed_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  deleted_at BIGINT
);
CREATE INDEX IF NOT EXISTS idx_memories_character ON public.memories(character_id) WHERE deleted_at IS NULL;
-- 注意：ivfflat 索引如果已存在可能无法直接用 IF NOT EXISTS 重建参数，这里保持安全写法
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_memories_embedding') THEN
    CREATE INDEX idx_memories_embedding ON public.memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
  END IF;
END $$;

-- relationships
CREATE TABLE IF NOT EXISTS public.relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  trust_level INTEGER NOT NULL DEFAULT 0,
  trust_stage TEXT NOT NULL DEFAULT 'stranger',
  emotion_state TEXT NOT NULL DEFAULT 'neutral',
  emotion_intensity REAL NOT NULL DEFAULT 0.5,
  total_messages INTEGER NOT NULL DEFAULT 0,
  last_interaction_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  deleted_at BIGINT,
  UNIQUE(character_id, user_id)
);

-- creations
CREATE TABLE IF NOT EXISTS public.creations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('oc', 'tone', 'comic', 'art_prompt', 'title')),
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '{}',
  images TEXT[] NOT NULL DEFAULT '{}',
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  deleted_at BIGINT
);
CREATE INDEX IF NOT EXISTS idx_creations_user_type ON public.creations(user_id, type) WHERE deleted_at IS NULL;

-- tool_usage（使用统计）
CREATE TABLE IF NOT EXISTS public.tool_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tool_type TEXT NOT NULL CHECK (tool_type IN (
    'oc_generator', 'tone_writer', 'comic_generator', 'art_prompt', 'title_optimizer', 'companion'
  )),
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);
CREATE INDEX IF NOT EXISTS idx_tool_usage_time ON public.tool_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_tool_usage_user_tool ON public.tool_usage(user_id, tool_type, created_at);

-- ============================================================
-- 2.5. 表结构升级（为已存在的表添加新列）
-- ============================================================

-- 为 users 表添加 role 列（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'role'
  ) THEN
    ALTER TABLE public.users
    ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'admin'));
  END IF;
END $$;

-- ============================================================
-- 3. Auth Trigger（匿名注册时自动创建 public.users 行）
-- ============================================================

-- 更新或创建函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, nickname, role, created_at, updated_at)
  VALUES (NEW.id, '', 'user', (extract(epoch from now()) * 1000)::bigint, (extract(epoch from now()) * 1000)::bigint)
  ON CONFLICT (id) DO NOTHING; -- 防止重复插入报错
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 删除旧触发器（如果存在）以防重复创建报错
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 创建新触发器
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 4. RLS 策略（用户只能访问自己的数据）
-- ============================================================

-- 启用 RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_usage ENABLE ROW LEVEL SECURITY;

-- 辅助函数：安全地重建策略
-- 因为 CREATE POLICY 没有 IF NOT EXISTS，我们需要先删后建

-- 辅助函数：检查当前用户是否为管理员（SECURITY DEFINER 绕过 RLS，避免递归）
-- 使用 plpgsql 防止函数内联，确保 SECURITY DEFINER 生效
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

-- RPC 函数：获取当前用户的角色（供客户端调用）
-- 使用 plpgsql 防止函数内联，确保 SECURITY DEFINER 生效
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

-- 4.1 Users 策略（拆分为两条，避免递归）
-- 普通用户：只能访问自己的行（纯表达式，零递归风险）
DROP POLICY IF EXISTS "own_data" ON public.users;
DROP POLICY IF EXISTS "users_self_access" ON public.users;
CREATE POLICY "users_self_access" ON public.users FOR ALL USING (
  auth.uid() = id
);

-- 管理员：可查看所有用户（is_admin() 现在是 plpgsql，不会被内联递归）
DROP POLICY IF EXISTS "users_admin_access" ON public.users;
CREATE POLICY "users_admin_access" ON public.users FOR SELECT USING (
  public.is_admin()
);

-- 4.2 Characters 策略（用户看自己，管理员看全部）
DROP POLICY IF EXISTS "own_data" ON public.characters;
CREATE POLICY "own_data" ON public.characters FOR ALL USING (
  auth.uid() = user_id OR public.is_admin()
);

-- 4.3 Messages 策略（用户看自己，管理员看全部）
DROP POLICY IF EXISTS "own_data" ON public.messages;
CREATE POLICY "own_data" ON public.messages FOR ALL USING (
  auth.uid() = user_id OR public.is_admin()
);

-- 4.4 Memories 策略（用户看自己，管理员看全部）
DROP POLICY IF EXISTS "own_data" ON public.memories;
CREATE POLICY "own_data" ON public.memories FOR ALL USING (
  auth.uid() = user_id OR public.is_admin()
);

-- 4.5 Relationships 策略（用户看自己，管理员看全部）
DROP POLICY IF EXISTS "own_data" ON public.relationships;
CREATE POLICY "own_data" ON public.relationships FOR ALL USING (
  auth.uid() = user_id OR public.is_admin()
);

-- 4.6 Creations 策略（用户看自己，管理员看全部）
DROP POLICY IF EXISTS "own_data" ON public.creations;
CREATE POLICY "own_data" ON public.creations FOR ALL USING (
  auth.uid() = user_id OR public.is_admin()
);

-- 4.7 Tool Usage 策略（用户看自己，管理员看全部）
DROP POLICY IF EXISTS "own_insert" ON public.tool_usage;
CREATE POLICY "own_insert" ON public.tool_usage FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_select" ON public.tool_usage;
CREATE POLICY "own_select" ON public.tool_usage FOR SELECT USING (
  auth.uid() = user_id OR public.is_admin()
);

-- ============================================================
-- 5. RPC 函数
-- ============================================================

-- 全局排行
CREATE OR REPLACE FUNCTION public.get_global_tool_ranking(p_days INTEGER DEFAULT NULL)
RETURNS TABLE(tool_type TEXT, usage_count BIGINT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
    SELECT tu.tool_type, COUNT(*)::bigint
    FROM public.tool_usage tu
    WHERE (p_days IS NULL OR tu.created_at >= (extract(epoch from now()) * 1000)::bigint - (p_days * 86400000))
    GROUP BY tu.tool_type
    ORDER BY usage_count ASC;
END; $$;

-- 个人排行
CREATE OR REPLACE FUNCTION public.get_personal_tool_ranking(p_user_id UUID, p_days INTEGER DEFAULT NULL)
RETURNS TABLE(tool_type TEXT, usage_count BIGINT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF auth.uid() != p_user_id THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN QUERY
    SELECT tu.tool_type, COUNT(*)::bigint
    FROM public.tool_usage tu
    WHERE tu.user_id = p_user_id
      AND (p_days IS NULL OR tu.created_at >= (extract(epoch from now()) * 1000)::bigint - (p_days * 86400000))
    GROUP BY tu.tool_type
    ORDER BY usage_count ASC;
END; $$;

-- 向量搜索
CREATE OR REPLACE FUNCTION public.search_memories(
  p_character_id UUID, p_query_embedding vector(1024), p_top_k INTEGER DEFAULT 5
)
RETURNS TABLE(
  id UUID, character_id UUID, user_id UUID, content TEXT, facts TEXT[],
  importance REAL, access_count INTEGER, last_accessed_at BIGINT,
  created_at BIGINT, similarity REAL
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
    SELECT m.id, m.character_id, m.user_id, m.content, m.facts,
           m.importance, m.access_count, m.last_accessed_at, m.created_at,
           (1 - (m.embedding <=> p_query_embedding))::real AS similarity
    FROM public.memories m
    WHERE m.character_id = p_character_id AND m.deleted_at IS NULL AND m.user_id = auth.uid()
    ORDER BY m.embedding <=> p_query_embedding LIMIT p_top_k;
END; $$;

-- ============================================================
-- 6. 管理员设置
-- ============================================================
-- 说明：Supabase Auth 账号（邮箱/密码）只能通过 Auth API 或控制台创建，
--       无法在 SQL 中直接注册账号。首位管理员的流程为：
--   1. 在应用或 Supabase 控制台 Authentication → Users → Add user 注册邮箱
--   2. 在 SQL Editor 执行：SELECT public.set_admin_by_email('your@email.com');
--   此函数仅 service_role/postgres 可调用，客户端无法直接提权。

CREATE OR REPLACE FUNCTION public.set_admin_by_email(p_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER -- 以函数owner权限执行，绕过RLS；仅限SQL Editor/service_role调用
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- 从 auth.users 查找对应邮箱的 UUID
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '用户不存在，请先通过 Supabase Auth 注册邮箱: %', p_email;
  END IF;

  UPDATE public.users
  SET role = 'admin', updated_at = (extract(epoch from now()) * 1000)::bigint
  WHERE id = v_user_id;

  RETURN '已将 ' || p_email || ' 设置为管理员 (id: ' || v_user_id || ')';
END;
$$;

-- 限制：只允许 postgres/service_role 调用，撤销普通用户执行权限
REVOKE EXECUTE ON FUNCTION public.set_admin_by_email(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_admin_by_email(TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_admin_by_email(TEXT) FROM anon;

-- ============================================================
-- 7. Storage Bucket（角色立绘图片存储）
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

DROP POLICY IF EXISTS "public_read_character_images" ON storage.objects;
CREATE POLICY "public_read_character_images" ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'character-images');

DROP POLICY IF EXISTS "users_delete_own_images" ON storage.objects;
CREATE POLICY "users_delete_own_images" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'character-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );