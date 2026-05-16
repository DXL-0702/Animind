'use client';

import { useState } from 'react';
import { llmClient } from '@/lib/llm/client';
import { COMIC_GENERATOR_PROMPT } from '@/lib/llm/prompts';
import { extractJSON } from '@/lib/utils/extract-json';
import { useTranslation } from '@/hooks/useTranslation';
import { useAppStore } from '@/stores/app-store';
import { dal } from '@/lib/dal';
import { buildPanelImagePrompt } from '@/lib/llm/image-prompt-builder';
import ToolPageShell from '@/components/layout/ToolPageShell';
import ToolInputCard from '@/components/layout/ToolInputCard';
import ImageProviderSelect from '@/components/ui/ImageProviderSelect';
import AlertIcon from '@/components/ui/AlertIcon';
import { useToast } from '@/hooks/useToast';
import type { ImageProvider } from '@/hooks/useImageGeneration';

export default function ComicGeneratorPage() {
  const { t, locale } = useTranslation();
  const userId = useAppStore((s) => s.userId);
  const [theme, setTheme] = useState('');
  const [loading, setLoading] = useState(false);
  const [comic, setComic] = useState<any>(null);
  const [panelImages, setPanelImages] = useState<(string | null)[]>([null, null, null, null]);
  const [imageGenProgress, setImageGenProgress] = useState<string | null>(null);
  const { error: toastError } = useToast();
  const [imageProvider, setImageProvider] = useState<ImageProvider>('jimeng');

  const handleGenerate = async () => {
    if (!theme.trim()) return;

    setLoading(true);
    try {
      const response = await llmClient.chat({
        messages: [
          { role: 'system', content: COMIC_GENERATOR_PROMPT(locale) },
          { role: 'user', content: `${locale === 'zh-CN' ? '主题' : 'テーマ'}：${theme}` },
        ],
        temperature: 0.9,
        max_tokens: 2000,
      });

      const parsed = extractJSON<any>(response.content);
      setComic(parsed);
      if (userId) dal.toolUsage.record(userId, 'comic_generator').catch(() => {});
    } catch (error) {
      console.error('Generation failed:', error);
      toastError(t('comic.fail'));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateArt = async () => {
    if (!comic?.panels) return;
    if (!confirm(t('comic.image.confirm'))) return;

    const images: (string | null)[] = [null, null, null, null];
    setPanelImages(images);

    for (let i = 0; i < comic.panels.length && i < 4; i++) {
      setImageGenProgress(t('comic.image.generating').replace('{n}', String(i + 1)));
      const panel = comic.panels[i];
      const { prompt: imgPrompt, negative_prompt } = buildPanelImagePrompt(panel);

      try {
        let url: string | null = null;

        if (imageProvider === 'doubao') {
          const res = await fetch('/api/image/doubao', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: imgPrompt }),
          });
          const data = await res.json();
          if (res.ok && data.image_url) {
            url = data.image_url;
          }
        } else {
          const jimengRes = await fetch('/api/image/jimeng', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: imgPrompt, negative_prompt }),
          });
          const jimengData = await jimengRes.json();
          if (jimengRes.ok && jimengData.image_url) {
            url = jimengData.image_url;
          }
        }

        images[i] = url;
        setPanelImages([...images]);
      } catch {
        images[i] = null;
      }
    }
    setImageGenProgress(null);
  };

  return (
    <ToolPageShell
      title={t('comic.title')}
      subtitle={t('comic.subtitle')}
      colorClass="text-accent"
      emoji="📖"
      maxWidthClass="max-w-6xl"
    >
      <ToolInputCard
        title={t('comic.input.title')}
        placeholder={t('comic.input.placeholder')}
        value={theme}
        onChange={setTheme}
        onSubmit={handleGenerate}
        loading={loading}
        submitLabel={t('comic.btn.generate')}
        loadingLabel={t('comic.btn.generating')}
        btnClass="btn-accent"
      />

      {comic && (
        <div className="mt-8 space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold">{comic.title}</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {comic.panels?.map((panel: any, i: number) => (
              <div key={i} className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <div className="flex items-center justify-between mb-4">
                    <span className="badge badge-accent badge-lg">{t('comic.panel').replace('{n}', String(panel.panel_number))}</span>
                    <span className="text-sm opacity-50">{panel.visual_focus}</span>
                  </div>
                  <div className="bg-base-200 p-4 rounded-lg min-h-[200px] flex flex-col justify-between">
                    {panelImages[i] && (
                      <img src={panelImages[i]!} alt={`Panel ${i + 1}`} className="rounded-lg mb-3 w-full object-cover max-h-48" />
                    )}
                    <div>
                      <p className="text-sm opacity-60 mb-3">{panel.scene}</p>
                      <div className="space-y-2">
                        {panel.characters?.map((char: string, j: number) => (
                          <p key={j} className="text-sm italic">· {char}</p>
                        ))}
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      {panel.dialogue?.map((line: string, j: number) => (
                        <div key={j} className="chat chat-start">
                          <div className="chat-bubble chat-bubble-primary">{line}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {comic.punchline && (
            <div className="alert alert-warning">
              <AlertIcon />
              <div>
                <h3 className="font-bold">{t('comic.punchline')}</h3>
                <div className="text-sm">{comic.punchline}</div>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <ImageProviderSelect
              value={imageProvider}
              onChange={setImageProvider}
              disabled={!!imageGenProgress}
            />
            <button
              className={`btn btn-accent flex-1 tap-feedback ${imageGenProgress ? 'loading' : ''}`}
              onClick={handleGenerateArt}
              disabled={!!imageGenProgress}
            >
              {imageGenProgress || `🎨 ${t('comic.btn.art')}`}
            </button>
            <button className="btn btn-outline flex-1 tap-feedback" onClick={() => setComic(null)}>
              🔄 {t('comic.btn.regenerate')}
            </button>
          </div>
        </div>
      )}
    </ToolPageShell>
  );
}
