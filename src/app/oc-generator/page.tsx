'use client';

import { useState, useEffect, useCallback } from 'react';
import { llmClient } from '@/lib/llm/client';
import { OC_GENERATOR_PROMPT } from '@/lib/llm/prompts';
import { extractJSON } from '@/lib/utils/extract-json';
import { dal } from '@/lib/dal';
import type { Character } from '@/lib/dal/types';
import { useTranslation } from '@/hooks/useTranslation';
import { useAppStore } from '@/stores/app-store';
import { useImageGeneration, type ImageProvider } from '@/hooks/useImageGeneration';
import { buildCharacterImagePrompt } from '@/lib/llm/image-prompt-builder';
import { uploadCharacterImage } from '@/lib/supabase/storage';

export default function OCGeneratorPage() {
  const { t, locale } = useTranslation();
  const userId = useAppStore((s) => s.userId);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [character, setCharacter] = useState<any>(null);
  const [imageProvider, setImageProvider] = useState<ImageProvider>('jimeng');
  const { generate: generateImage, isGenerating: imageGenerating, progress: imageProgress, imageUrl: generatedImageUrl, error: imageError, reset: resetImage } = useImageGeneration(imageProvider);

  // New state for save-first flow + browse mode
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [savedCharacterId, setSavedCharacterId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'create' | 'browse'>('create');
  const [myCharacters, setMyCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);

  // Load user's characters
  const loadMyCharacters = useCallback(async () => {
    if (!userId) return;
    try {
      const chars = await dal.characters.getByUserId(userId, { orderBy: 'created_at', orderDirection: 'desc' });
      setMyCharacters(chars);
    } catch (e) {
      console.error('Failed to load characters:', e);
    }
  }, [userId]);

  useEffect(() => { loadMyCharacters(); }, [loadMyCharacters]);

  // Keep selectedCharacter in sync when myCharacters updates (e.g. after image upload)
  useEffect(() => {
    if (!selectedCharacter) return;
    const updated = myCharacters.find((c) => c.id === selectedCharacter.id);
    if (updated && updated.image_url !== selectedCharacter.image_url) {
      setSelectedCharacter(updated);
    }
  }, [myCharacters, selectedCharacter]);

  // Auto-upload image to storage and update DB when image is generated after save
  useEffect(() => {
    if (!generatedImageUrl || !savedCharacterId || !userId) return;
    setImageUploadError(null);

    let mounted = true;

    (async () => {
      try {
        console.log('[OC] Starting image upload for character:', savedCharacterId);
        const publicUrl = await uploadCharacterImage(userId, savedCharacterId, generatedImageUrl);

        if (!mounted) {
          console.warn('[OC] Component unmounted, skipping DB update');
          return;
        }

        console.log('[OC] Image uploaded successfully, updating DB with URL:', publicUrl);
        await dal.characters.update(savedCharacterId, { image_url: publicUrl });

        console.log('[OC] DB updated successfully');
        setMyCharacters((prev) =>
          prev.map((c) => c.id === savedCharacterId ? { ...c, image_url: publicUrl } : c)
        );

        // 显示成功提示
        alert('立绘已保存！');
      } catch (e) {
        console.error('[OC] Image upload/save failed:', e);
        const errorMsg = e instanceof Error ? e.message : '未知错误';
        setImageUploadError(`${t('oc.image.uploadFail')}: ${errorMsg}`);

        // 显示详细错误
        alert(`立绘保存失败：${errorMsg}\n\n请检查：\n1. Supabase Storage bucket 是否已创建\n2. 网络连接是否正常\n3. 浏览器控制台是否有详细错误信息`);
      }
    })();

    return () => { mounted = false; };
  }, [generatedImageUrl, savedCharacterId, userId, t]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setSavedCharacterId(null);
    resetImage();
    try {
      const response = await llmClient.chat({
        messages: [
          { role: 'system', content: OC_GENERATOR_PROMPT(locale) },
          { role: 'user', content: `${locale === 'zh-CN' ? '生成角色要求' : 'キャラ生成要件'}：${prompt}` },
        ],
        temperature: 0.9,
        max_tokens: 2000,
      });
      const parsed = extractJSON<any>(response.content);
      setCharacter(parsed);
      if (userId) dal.toolUsage.record(userId, 'oc_generator').catch(() => {});
    } catch (error) {
      console.error('Generation failed:', error);
      alert(t('oc.generate.fail'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!character) return;
    if (!userId) { alert(t('oc.save.wait')); return; }
    setSaving(true);
    try {
      const newChar = await dal.characters.create({
        user_id: userId,
        name: character.name,
        personality: JSON.stringify(character.personality),
        appearance: JSON.stringify(character.appearance),
        backstory: character.backstory,
        image_url: null,
        voice_id: 'BV700_V2_streaming',
        deleted_at: null,
      });
      setSavedCharacterId(newChar.id);
      loadMyCharacters();
      alert(t('oc.save.success'));
    } catch (error) {
      console.error('Save failed:', error);
      alert(t('oc.save.fail'));
    } finally {
      setSaving(false);
    }
  };

  const parsedPersonality = (char: Character) => {
    try { return JSON.parse(char.personality); } catch { return null; }
  };
  const parsedAppearance = (char: Character) => {
    try { return JSON.parse(char.appearance); } catch { return null; }
  };

  // --- Render helpers ---

  const renderSaveButton = () => {
    if (saving) return <button className="btn btn-primary flex-1" disabled>{t('oc.btn.saving')}</button>;
    if (savedCharacterId) return <button className="btn btn-success flex-1" disabled>{t('oc.btn.saved')}</button>;
    return <button className="btn btn-primary flex-1" onClick={handleSave}>💾 {t('oc.btn.save')}</button>;
  };

  const renderCharacterDetail = (char: any, imageUrl?: string | null, isLive?: boolean) => {
    const personality = char.personality?.core_traits ? char.personality : (typeof char.personality === 'string' ? parsedPersonality(char as Character) : char.personality);
    const appearance = char.appearance?.hair ? char.appearance : (typeof char.appearance === 'string' ? parsedAppearance(char as Character) : char.appearance);
    const displayImage = imageUrl ?? char.image_url;

    return (
      <div className="space-y-4">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="text-3xl font-bold text-primary">{char.name}</h2>
            <div className="flex gap-4 text-sm">
              {char.age && <span className="badge badge-primary">{String(char.age).replace(/岁|歳/g, '')}{t('oc.label.age')}</span>}
              {char.gender && <span className="badge badge-secondary">{char.gender}</span>}
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title">{t('oc.section.personality')}</h3>
            <div className="space-y-2">
              {personality?.core_traits && (
                <div>
                  <span className="font-semibold">{t('oc.label.core_traits')}</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {personality.core_traits.map((trait: string, i: number) => (
                      <span key={i} className="badge badge-outline">{trait}</span>
                    ))}
                  </div>
                </div>
              )}
              {personality?.speech_style && (
                <div>
                  <span className="font-semibold">{t('oc.label.speech_style')}</span>
                  <p className="mt-1">{personality.speech_style}</p>
                </div>
              )}
              {personality?.quirks && (
                <div>
                  <span className="font-semibold">{t('oc.label.quirks')}</span>
                  <ul className="list-disc list-inside mt-1">
                    {personality.quirks.map((quirk: string, i: number) => (
                      <li key={i}>{quirk}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title">{t('oc.section.appearance')}</h3>
            {displayImage && (
              <div className="flex justify-center mb-4">
                <img src={displayImage} alt={char.name} className="rounded-lg max-h-80 object-contain" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {appearance?.hair && <div><span className="font-semibold">{t('oc.label.hair')}</span><p>{appearance.hair}</p></div>}
              {appearance?.eyes && <div><span className="font-semibold">{t('oc.label.eyes')}</span><p>{appearance.eyes}</p></div>}
              {appearance?.height && <div><span className="font-semibold">{t('oc.label.height')}</span><p>{appearance.height}</p></div>}
              {appearance?.clothing && <div><span className="font-semibold">{t('oc.label.clothing')}</span><p>{appearance.clothing}</p></div>}
              {appearance?.distinctive_features && <div className="col-span-2"><span className="font-semibold">{t('oc.label.distinctive')}</span><p>{appearance.distinctive_features}</p></div>}
            </div>
            {isLive && (
              <>
                <div className="flex items-center gap-2 mt-4">
                  <select className="select select-bordered select-sm" value={imageProvider} onChange={(e) => setImageProvider(e.target.value as ImageProvider)} disabled={imageGenerating}>
                    <option value="jimeng">即梦AI (Anime)</option>
                    <option value="doubao">豆包 Seedream 4.5</option>
                  </select>
                  <button
                    className={`btn btn-accent btn-sm flex-1`}
                    onClick={() => {
                      const { prompt: imgPrompt, negative_prompt } = buildCharacterImagePrompt(character.appearance || {}, character.gender);
                      generateImage(imgPrompt, negative_prompt);
                    }}
                    disabled={imageGenerating}
                  >
                    {imageGenerating ? `${t('oc.image.generating')}` : `🎨 ${t('oc.btn.generateImage')}`}
                  </button>
                </div>
                {imageGenerating && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span>{imageProgress === 'submitting' ? '提交中...' : imageProgress === 'pending' ? '生成中...' : '处理中...'}</span>
                      <span>{imageProgress}</span>
                    </div>
                    <progress className="progress progress-accent w-full" value={imageProgress === 'submitting' ? 30 : imageProgress === 'pending' ? 60 : 90} max="100"></progress>
                  </div>
                )}
                {imageError && <p className="text-error text-sm mt-1">{t('oc.image.fail')}: {imageError}</p>}
                {imageUploadError && <p className="text-warning text-sm mt-1">{imageUploadError}</p>}
              </>
            )}
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title">{t('oc.section.backstory')}</h3>
            <p className="leading-relaxed">{char.backstory}</p>
          </div>
        </div>

        {(char.relationships || char.goals) && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title">{t('oc.section.relations')}</h3>
              <div className="space-y-2">
                {char.relationships && <div><span className="font-semibold">{t('oc.label.relationships')}</span><p>{char.relationships}</p></div>}
                {char.goals && <div><span className="font-semibold">{t('oc.label.goals')}</span><p>{char.goals}</p></div>}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen theme-bg p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-4 flex-wrap">
            <a href="/" className="btn btn-ghost btn-sm">{t('nav.back')}</a>
            <button className={`btn btn-sm ${mode === 'create' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMode('create')}>
              {t('oc.mode.create')}
            </button>
            {myCharacters.length > 0 && (
              <button className={`btn btn-sm ${mode === 'browse' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setMode('browse'); setSelectedCharacter(null); }}>
                {t('oc.mode.browse')} ({myCharacters.length})
              </button>
            )}
          </div>
          <h1 className="text-4xl font-bold mt-4 text-primary">🎨 {t('oc.title')}</h1>
          <p className="opacity-60 mt-2">{t('oc.subtitle')}</p>
        </div>

        {mode === 'create' && (
          <>
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">{t('oc.input.title')}</h2>
                <textarea
                  className="textarea textarea-bordered h-32"
                  placeholder={t('oc.input.placeholder')}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
                <button
                  className={`btn btn-primary ${loading ? 'loading' : ''}`}
                  onClick={handleGenerate}
                  disabled={loading || !prompt.trim()}
                >
                  {loading ? t('oc.btn.generating') : t('oc.btn.generate')}
                </button>
              </div>
            </div>

            {character && (
              <div className="mt-8">
                {renderCharacterDetail(character, generatedImageUrl, true)}
                <div className="flex gap-4 mt-4">
                  {renderSaveButton()}
                  <button className="btn btn-outline flex-1" onClick={() => { setCharacter(null); setSavedCharacterId(null); resetImage(); }}>
                    🔄 {t('oc.btn.regenerate')}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {mode === 'browse' && (
          <div className="flex gap-6">
            <div className="w-1/3 space-y-2">
              {myCharacters.map((char) => {
                const p = parsedPersonality(char);
                const traits = p?.core_traits?.slice(0, 3) || [];
                return (
                  <div
                    key={char.id}
                    className={`card bg-base-100 shadow cursor-pointer hover:shadow-lg transition-shadow ${selectedCharacter?.id === char.id ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setSelectedCharacter(char)}
                  >
                    <div className="card-body p-3 flex-row items-center gap-3">
                      {char.image_url ? (
                        <img src={char.image_url} alt={char.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-base-200 flex items-center justify-center flex-shrink-0 text-xl">🎭</div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{char.name}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {traits.map((trait: string, i: number) => (
                            <span key={i} className="badge badge-outline badge-xs">{trait}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {myCharacters.length === 0 && (
                <p className="text-center opacity-50 py-8">{t('oc.browse.empty')}</p>
              )}
            </div>
            <div className="w-2/3">
              {selectedCharacter ? (
                renderCharacterDetail(selectedCharacter)
              ) : (
                <div className="flex items-center justify-center h-64 opacity-50">
                  <p>{t('oc.browse.selectPrompt')}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
