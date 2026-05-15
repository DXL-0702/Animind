'use client';

import { useState } from 'react';
import { llmClient } from '@/lib/llm/client';
import { TITLE_OPTIMIZER_PROMPT } from '@/lib/llm/prompts';
import { extractJSON } from '@/lib/utils/extract-json';
import { useTranslation } from '@/hooks/useTranslation';
import { useAppStore } from '@/stores/app-store';
import { dal } from '@/lib/dal';
import ToolPageShell from '@/components/layout/ToolPageShell';
import ToolInputCard from '@/components/layout/ToolInputCard';
import AlertIcon from '@/components/ui/AlertIcon';
import { useToast } from '@/hooks/useToast';

export default function TitleOptimizerPage() {
  const { t, locale } = useTranslation();
  const userId = useAppStore((s) => s.userId);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { error: toastError } = useToast();
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
      toastError(t('title.fail'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolPageShell
      title={t('title.title')}
      subtitle={t('title.subtitle')}
      colorClass="text-success"
      emoji="🏷️"
    >
      <ToolInputCard
        title={t('title.input.title')}
        placeholder={t('title.input.placeholder')}
        value={input}
        onChange={setInput}
        onSubmit={handleOptimize}
        loading={loading}
        submitLabel={t('title.btn.optimize')}
        loadingLabel={t('title.btn.optimizing')}
        btnClass="btn-success"
      />

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
              <AlertIcon />
              <span>{result.optimization_tips}</span>
            </div>
          )}
        </div>
      )}
    </ToolPageShell>
  );
}
