'use client';

import { useState } from 'react';
import { llmClient } from '@/lib/llm/client';
import { TITLE_OPTIMIZER_PROMPT } from '@/lib/llm/prompts';
import { extractJSON } from '@/lib/utils/extract-json';
import { useTranslation } from '@/hooks/useTranslation';
import { useAppStore } from '@/stores/app-store';
import { dal } from '@/lib/dal';

export default function TitleOptimizerPage() {
  const { t, locale } = useTranslation();
  const userId = useAppStore((s) => s.userId);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleOptimize = async () => {
    if (!input.trim()) return;

    setLoading(true);
    try {
      const response = await llmClient.chat({
        messages: [
          { role: 'system', content: TITLE_OPTIMIZER_PROMPT(locale) },
          { role: 'user', content: `${locale === 'zh-CN' ? '请优化以下内容的标题和标签' : '以下のコンテンツのタイトルとタグを最適化してください'}：\n\n${input}` },
        ],
        temperature: 0.8,
      });

      const parsed = extractJSON<any>(response.content);
      setResult(parsed);
      if (userId) dal.toolUsage.record(userId, 'title_optimizer').catch(() => {});
    } catch (error) {
      console.error('Optimization failed:', error);
      alert(t('title.fail'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen theme-bg p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <a href="/" className="btn btn-ghost btn-sm">{t('nav.back')}</a>
          <h1 className="text-4xl font-bold mt-4 text-success">🏷️ {t('title.title')}</h1>
          <p className="opacity-60 mt-2">{t('title.subtitle')}</p>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">{t('title.input.title')}</h2>
            <textarea
              className="textarea textarea-bordered h-32"
              placeholder={t('title.input.placeholder')}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              className={`btn btn-success ${loading ? 'loading' : ''}`}
              onClick={handleOptimize}
              disabled={loading || !input.trim()}
            >
              {loading ? t('title.btn.optimizing') : t('title.btn.optimize')}
            </button>
          </div>
        </div>

        {result && (
          <div className="mt-8 space-y-4">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title">{t('title.result.titles')}</h3>
                {result.optimized_titles?.map((title: string, i: number) => (
                  <div key={i} className="p-3 bg-base-200 rounded-lg">
                    <span className="badge badge-success mr-2">{t('title.scheme').replace('{n}', String(i + 1))}</span>
                    {title}
                  </div>
                ))}
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title">{t('title.result.tags')}</h3>
                <div className="space-y-2">
                  <div>
                    <span className="font-semibold">{t('title.result.hot')}</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {result.tags?.hot_tags?.map((tag: string, i: number) => (
                        <span key={i} className="badge badge-error">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="font-semibold">{t('title.result.niche')}</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {result.tags?.niche_tags?.map((tag: string, i: number) => (
                        <span key={i} className="badge badge-info">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {result.optimization_tips && (
              <div className="alert alert-info">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span>{result.optimization_tips}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
