'use client';

import { useState } from 'react';
import { llmClient } from '@/lib/llm/client';
import { COMIC_GENERATOR_PROMPT } from '@/lib/llm/prompts';
import { extractJSON } from '@/lib/utils/extract-json';
import { useTranslation } from '@/hooks/useTranslation';
import { useAppStore } from '@/stores/app-store';
import { dal } from '@/lib/dal';
import { buildPanelImagePrompt } from '@/lib/llm/image-prompt-builder';
import type { ImageProvider } from '@/hooks/useImageGeneration';

export default function ComicGeneratorPage() {
  const { t, locale } = useTranslation();
  const userId = useAppStore((s) => s.userId);
  const [theme, setTheme] = useState('');
  const [loading, setLoading] = useState(false);
  const [comic, setComic] = useState<any>(null);
  const [panelImages, setPanelImages] = useState<(string | null)[]>([null, null, null, null]);
  const [imageGenProgress, setImageGenProgress] = useState<string | null>(null);
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
      alert(t('comic.fail'));
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
    <div className="min-h-screen theme-bg p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <a href="/" className="btn btn-ghost btn-sm">{t('nav.back')}</a>
          <h1 className="text-4xl font-bold mt-4 text-accent">📖 {t('comic.title')}</h1>
          <p className="opacity-60 mt-2">{t('comic.subtitle')}</p>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">{t('comic.input.title')}</h2>
            <textarea
              className="textarea textarea-bordered h-24"
              placeholder={t('comic.input.placeholder')}
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
            />
            <button
              className={`btn btn-accent ${loading ? 'loading' : ''}`}
              onClick={handleGenerate}
              disabled={loading || !theme.trim()}
            >
              {loading ? t('comic.btn.generating') : t('comic.btn.generate')}
            </button>
          </div>
        </div>

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
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <div>
                  <h3 className="font-bold">{t('comic.punchline')}</h3>
                  <div className="text-sm">{comic.punchline}</div>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <select
                className="select select-bordered select-sm"
                value={imageProvider}
                onChange={(e) => setImageProvider(e.target.value as ImageProvider)}
                disabled={!!imageGenProgress}
              >
                <option value="jimeng">即梦AI (Anime)</option>
                <option value="doubao">豆包 Seedream 4.5</option>
              </select>
              <button
                className={`btn btn-accent flex-1 ${imageGenProgress ? 'loading' : ''}`}
                onClick={handleGenerateArt}
                disabled={!!imageGenProgress}
              >
                {imageGenProgress || `🎨 ${t('comic.btn.art')}`}
              </button>
              <button className="btn btn-outline flex-1" onClick={() => setComic(null)}>
                🔄 {t('comic.btn.regenerate')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}