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
import ToolPageShell from '@/components/layout/ToolPageShell';
import ToolInputCard from '@/components/layout/ToolInputCard';
import ImageProviderSelect from '@/components/ui/ImageProviderSelect';
import { useToast } from '@/hooks/useToast';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function OCGeneratorPage() {
  const { t, locale } = useTranslation();
  const userId = useAppStore((s) => s.userId);
  const setUserId = useAppStore((s) => s.setUserId);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [character, setCharacter] = useState<any>(null);
  const { success: toastSuccess, error: toastError } = useToast();
  const [imageProvider, setImageProvider] = useState<ImageProvider>('jimeng');
  const { generate: generateImage, isGenerating: imageGenerating, progress: imageProgress, imageUrl: generatedImageUrl, error: imageError, reset: resetImage } = useImageGeneration(imageProvider);

  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [savedCharacterId, setSavedCharacterId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'create' | 'browse'>('create');
  const [myCharacters, setMyCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);

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

  useEffect(() => {
    if (!selectedCharacter) return;
    const updated = myCharacters.find((c) => c.id === selectedCharacter.id);
    if (updated && updated.image_url !== selectedCharacter.image_url) {
      setSelectedCharacter(updated);
    }
  }, [myCharacters, selectedCharacter]);

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

        toastSuccess('立绘已保存！');
      } catch (e) {
        console.error('[OC] Image upload/save failed:', e);
        const errorMsg = e instanceof Error ? e.message : '未知错误';
        setImageUploadError(`${t('oc.image.uploadFail')}: ${errorMsg}`);
        toastError(`立绘保存失败：${errorMsg}`);
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
      toastError(t('oc.generate.fail'));
    } finally {
      setLoading(false);
    }
  };

  const getCurrentUserId = async (): Promise<string | null> => {
    if (userId) return userId;

    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    const sessionUserId = session?.user.id ?? null;
    if (sessionUserId) setUserId(sessionUserId);
    return sessionUserId;
  };

  const handleSave = async () => {
    if (!character) return;
    setSaving(true);
    try {
      const currentUserId = await getCurrentUserId();
      if (!currentUserId) {
        toastError(t('oc.save.wait'));
        return;
      }

      const existingUser = await dal.users.getById(currentUserId);
      if (!existingUser) {
        await dal.users.create({ id: currentUserId, nickname: '', deleted_at: null });
      }

      const newChar = await dal.characters.create({
        user_id: currentUserId,
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
      toastSuccess(t('oc.save.success'));
    } catch (error) {
      console.error('Save failed:', error);
      toastError(t('oc.save.fail'));
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

  const renderSaveButton = () => {
    if (saving) return <button className="btn btn-primary flex-1 tap-feedback" disabled>{t('oc.btn.saving')}</button>;
    if (savedCharacterId) return <button className="btn btn-success flex-1" disabled>{t('oc.btn.saved')}</button>;
    return <button className="btn btn-primary flex-1 tap-feedback" onClick={handleSave}>💾 {t('oc.btn.save')}</button>;
  };

  const renderCharacterDetail = (char: any, imageUrl?: string | null, isLive?: boolean) => {
    const personality = char.personality?.core_traits ? char.personality : (typeof char.personality === 'string' ? parsedPersonality(char as Character) : char.personality);
    const appearance = char.appearance?.hair ? char.appearance : (typeof char.appearance === 'string' ? parsedAppearance(char as Character) : char.appearance);
    const displayImage = imageUrl ?? char.image_url;

    return (
      <div className="space-y-4">
        <div className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow duration-300">
          <div className="card-body">
            <h2 className="text-3xl font-bold text-primary">{char.name}</h2>
            <div className="flex gap-4 text-sm">
              {char.age && <span className="badge badge-primary">{String(char.age).replace(/岁|歳/g, '')}{t('oc.label.age')}</span>}
              {char.gender && <span className="badge badge-secondary">{char.gender}</span>}
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow duration-300">
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

        <div className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow duration-300">
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
                  <ImageProviderSelect value={imageProvider} onChange={setImageProvider} disabled={imageGenerating} />
                  <button
                    className="btn btn-accent btn-sm flex-1 tap-feedback"
                    onClick={() => {
                      const { prompt: imgPrompt, negative_prompt } = buildCharacterImagePrompt(
                        character.appearance || {},
                        character.gender,
                        imageProvider
                      );
                      console.log('[OC] 生成的提示词:', imgPrompt);
                      console.log('[OC] 提示词长度:', imgPrompt.length, '字');
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

        <div className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow duration-300">
          <div className="card-body">
            <h3 className="card-title">{t('oc.section.backstory')}</h3>
            <p className="leading-relaxed">{char.backstory}</p>
          </div>
        </div>

        {(char.relationships || char.goals) && (
          <div className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow duration-300">
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

  const shellContent = (
    <>
      <div className="mb-8">
        <div className="flex items-center gap-4 flex-wrap">
          <button className={`btn btn-sm ${mode === 'create' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMode('create')}>
            {t('oc.mode.create')}
          </button>
          {myCharacters.length > 0 && (
            <button className={`btn btn-sm ${mode === 'browse' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setMode('browse'); setSelectedCharacter(null); }}>
              {t('oc.mode.browse')} ({myCharacters.length})
            </button>
          )}
        </div>
      </div>

      {mode === 'create' && (
        <>
          <ToolInputCard
            title={t('oc.input.title')}
            placeholder={t('oc.input.placeholder')}
            value={prompt}
            onChange={setPrompt}
            onSubmit={handleGenerate}
            loading={loading}
            submitLabel={t('oc.btn.generate')}
            loadingLabel={t('oc.btn.generating')}
            btnClass="btn-primary"
          />

          {character && (
            <div className="mt-8 card-enter">
              {renderCharacterDetail(character, generatedImageUrl, true)}
              <div className="flex gap-4 mt-4">
                {renderSaveButton()}
                <button className="btn btn-outline flex-1 active:scale-[0.97] transition-transform" onClick={() => { setCharacter(null); setSavedCharacterId(null); resetImage(); }}>
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
                  className={`card bg-base-100 shadow-md cursor-pointer hover:shadow-lg active:scale-[0.98] transition-all duration-200 ${selectedCharacter?.id === char.id ? 'ring-2 ring-primary bg-primary/5' : ''}`}
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
    </>
  );

  return (
    <ToolPageShell
      title={t('oc.title')}
      subtitle={t('oc.subtitle')}
      colorClass="text-primary"
      emoji="🎨"
    >
      {shellContent}
    </ToolPageShell>
  );
}
