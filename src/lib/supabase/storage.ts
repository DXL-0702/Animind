import { getSupabaseBrowserClient } from './client';

const BUCKET = 'character-images';

/**
 * 确保 storage bucket 存在且为 public
 * Supabase 不会自动创建 bucket，需要手动或通过 API 创建
 */
async function ensureBucket() {
  const supabase = getSupabaseBrowserClient();
  // 尝试获取 bucket 信息，如果不存在则创建
  const { error: getError } = await supabase.storage.getBucket(BUCKET);
  if (getError) {
    // bucket 不存在，尝试创建（需要 service_role 或 bucket 创建权限）
    const { error: createError } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    });
    if (createError && !createError.message?.includes('already exists')) {
      console.warn('[Storage] Cannot create bucket, please create it manually in Supabase Dashboard:', createError.message);
    }
  }
}

// 初始化时检查一次
let bucketChecked = false;

export async function uploadCharacterImage(
  userId: string,
  characterId: string,
  imageUrl: string
): Promise<string> {
  console.log('[Storage] Starting upload for character:', characterId);

  let blob: Blob;
  if (imageUrl.startsWith('data:')) {
    // base64 data URL (Jimeng)
    console.log('[Storage] Converting base64 to blob');
    const base64 = imageUrl.split(',')[1];
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    blob = new Blob([bytes], { type: 'image/png' });
  } else {
    // Remote URL (Doubao CDN) — fetch to blob so we can persist it
    console.log('[Storage] Fetching remote image:', imageUrl);
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    blob = await res.blob();
  }

  console.log('[Storage] Blob created, size:', blob.size, 'bytes');

  const path = `${userId}/${characterId}.png`;
  const supabase = getSupabaseBrowserClient();

  // 首次调用时确保 bucket 存在
  if (!bucketChecked) {
    console.log('[Storage] Checking if bucket exists...');
    await ensureBucket();
    bucketChecked = true;
  }

  console.log('[Storage] Uploading to path:', path);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { upsert: true, contentType: 'image/png' });

  if (error) {
    console.error('[Storage] Upload failed:', error);
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  // 添加 cache-busting 参数，避免浏览器缓存旧图片
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const finalUrl = `${data.publicUrl}?t=${Date.now()}`;
  console.log('[Storage] Upload successful, public URL:', finalUrl);
  return finalUrl;
}
