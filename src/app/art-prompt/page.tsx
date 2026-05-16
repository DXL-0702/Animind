'use client';

import { useState, useCallback } from 'react';
import { llmClient } from '@/lib/llm/client';
import { ART_PROMPT_GENERATOR } from '@/lib/llm/prompts';
import { extractJSON } from '@/lib/utils/extract-json';
import { useTranslation } from '@/hooks/useTranslation';
import { useAppStore } from '@/stores/app-store';
import { dal } from '@/lib/dal';
import ToolPageShell from '@/components/layout/ToolPageShell';
import ToolInputCard from '@/components/layout/ToolInputCard';
import ImageProviderSelect from '@/components/ui/ImageProviderSelect';
import { useToast } from '@/hooks/useToast';
import type { ImageProvider } from '@/hooks/useImageGeneration';

type Stage = 'input' | 'prompt' | 'image' | 'done';

export default function ArtPromptPage() {
  const { t, locale } = useTranslation();
  const userId = useAppStore((s) => s.userId);
  const [input, setInput] = useState('');
  const [stage, setStage] = useState<Stage>('input');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { success: toastSuccess, error: toastError } = useToast();
  const [imageProvider, setImageProvider] = useState<ImageProvider>('jimeng');

  const generateImage = useCallback(async (jimengPrompt: string) => {
    setStage('image');
    setError(null);
    try {
      const endpoint = imageProvider === 'doubao' ? '/api/image/doubao' : '/api/image/jimeng';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: jimengPrompt }),
      });
      const data = await res.json();
      if (!res.ok || !data.image_url) throw new Error(data.error || 'Generation failed');
      setImageUrl(data.image_url);
      setStage('done');
    } catch (e) {
      console.error('Image generation failed:', e);
      toastError(t('art.image.fail'));
      setError(t('art.image.fail'));
      setStage('done');
    }
  }, [imageProvider, t]);

  const handleGenerate = async () => {
    if (!input.trim()) return;

    setLoading(true);
    setResult(null);
    setImageUrl(null);
    setError(null);
    setStage('prompt');

    try {
      const response = await llmClient.chat({
        messages: [
          { role: 'system', content: ART_PROMPT_GENERATOR(locale) },
          { role: 'user', content: `${locale === 'zh-CN' ? '请将以下描述转换为专业绘画提示词' : '以下の説明をプロフェッショナルな描画プロンプトに変換してください'}：\n\n${input}` },
        ],
        temperature: 0.7,
      });

      const parsed = extractJSON<any>(response.content);
      setResult(parsed);
      setLoading(false);
      if (userId) dal.toolUsage.record(userId, 'art_prompt').catch(() => {});

      if (parsed.jimeng_prompt) {
        await generateImage(parsed.jimeng_prompt);
      }
    } catch (e) {
      console.error('Generation failed:', e);
      toastError(t('art.fail'));
      setError(t('art.fail'));
      setStage('input');
      setLoading(false);
    }
  };

  const handleRegenerate = () => {
    setStage('input');
    setResult(null);
    setImageUrl(null);
    setError(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toastSuccess(t('art.copied'));
  };

  const steps = [
    { key: 'prompt', label: t('art.step.prompt') },
    { key: 'image', label: t('art.step.image') },
    { key: 'done', label: t('art.step.done') },
  ];

  const currentStepIndex = stage === 'input' ? -1 : steps.findIndex(s => s.key === stage);

  return (
    <ToolPageShell
      title={t('art.title')}
      subtitle={t('art.subtitle')}
      colorClass="text-info"
      emoji="🎨"
      steps={steps}
      activeStep={currentStepIndex}
    >
      <ToolInputCard
        title={t('art.input.title')}
        placeholder={t('art.input.placeholder')}
        value={input}
        onChange={setInput}
        onSubmit={stage === 'input' ? handleGenerate : handleRegenerate}
        loading={loading}
        submitLabel={stage === 'input' ? t('art.btn.generate') : t('art.btn.regenerate')}
        loadingLabel={t('art.btn.generating')}
        btnClass={stage === 'input' ? 'btn-info' : 'btn-outline btn-info'}
        disabled={stage !== 'input' && stage !== 'done'}
        extraActions={
          stage === 'input' ? (
            <ImageProviderSelect
              value={imageProvider}
              onChange={setImageProvider}
            />
          ) : null
        }
      />

      {error && (
        <div className="alert alert-error mt-4">
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="mt-8 space-y-4">
          {result.jimeng_prompt && (
            <div className="card bg-base-100 shadow-xl border-2 border-info">
              <div className="card-body">
                <div className="flex justify-between items-center">
                  <h3 className="card-title text-info">🎯 即梦AI提示词</h3>
                  <button className="btn btn-sm btn-ghost tap-feedback" onClick={() => copyToClipboard(result.jimeng_prompt)}>
                    📋 {t('art.copy')}
                  </button>
                </div>
                <div className="p-4 bg-base-200 rounded-lg text-sm">
                  {result.jimeng_prompt}
                </div>
              </div>
            </div>
          )}

          <div className="collapse collapse-arrow bg-base-100 shadow-xl">
            <input type="checkbox" />
            <div className="collapse-title font-medium">
              📝 SD / Midjourney {t('art.positive')} & {t('art.negative')}
            </div>
            <div className="collapse-content space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold">{t('art.positive')}</span>
                  <button className="btn btn-sm btn-ghost tap-feedback" onClick={() => copyToClipboard(result.positive_prompt)}>
                    📋 {t('art.copy')}
                  </button>
                </div>
                <div className="p-4 bg-base-200 rounded-lg font-mono text-sm">
                  {result.positive_prompt}
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold">{t('art.negative')}</span>
                  <button className="btn btn-sm btn-ghost tap-feedback" onClick={() => copyToClipboard(result.negative_prompt)}>
                    📋 {t('art.copy')}
                  </button>
                </div>
                <div className="p-4 bg-base-200 rounded-lg font-mono text-sm">
                  {result.negative_prompt}
                </div>
              </div>
              <div>
                <span className="font-semibold">{t('art.params')}</span>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div><span className="font-semibold">Steps:</span> {result.recommended_params?.steps}</div>
                  <div><span className="font-semibold">CFG Scale:</span> {result.recommended_params?.cfg_scale}</div>
                  <div className="col-span-2"><span className="font-semibold">Sampler:</span> {result.recommended_params?.sampler}</div>
                </div>
              </div>
            </div>
          </div>

          {result.style_tags?.length > 0 && (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title">{t('art.tags')}</h3>
                <div className="flex flex-wrap gap-2">
                  {result.style_tags.map((tag: string, i: number) => (
                    <span key={i} className="badge badge-secondary">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {stage === 'image' && (
        <div className="mt-8 card bg-base-100 shadow-xl">
          <div className="card-body items-center text-center">
            <span className="loading loading-spinner loading-lg text-info"></span>
            <p className="mt-4 text-lg">{t('art.image.generating')}</p>
            <p className="text-sm opacity-50">通常需要30-60秒</p>
          </div>
        </div>
      )}

      {imageUrl && (
        <div className="mt-8 card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title text-info">🖼️ 生成结果</h3>
            <figure className="rounded-lg overflow-hidden">
              <img src={imageUrl} alt="Generated anime art" className="w-full" />
            </figure>
          </div>
        </div>
      )}
    </ToolPageShell>
  );
}
