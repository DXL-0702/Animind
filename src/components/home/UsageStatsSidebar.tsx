'use client';

import { useState, useEffect, useCallback } from 'react';
import { dal } from '@/lib/dal';
import { useTranslation } from '@/hooks/useTranslation';
import { useAppStore } from '@/stores/app-store';

type Mode = 'global' | 'personal';
type TimeRange = 7 | 30 | null;

const TOOL_META: Record<string, { icon: string; toolKey: string }> = {
  oc_generator: { icon: '🎨', toolKey: 'tool.oc-generator' },
  tone_writer: { icon: '✍️', toolKey: 'tool.tone-writer' },
  comic_generator: { icon: '📖', toolKey: 'tool.comic-generator' },
  art_prompt: { icon: '🖼️', toolKey: 'tool.art-prompt' },
  title_optimizer: { icon: '🏷️', toolKey: 'tool.title-optimizer' },
  companion: { icon: '💖', toolKey: 'tool.companion' },
};

interface RankItem {
  tool_type: string;
  usage_count: number;
}

export default function UsageStatsSidebar() {
  const { t } = useTranslation();
  const userId = useAppStore((s) => s.userId);
  const [mode, setMode] = useState<Mode>('global');
  const [timeRange, setTimeRange] = useState<TimeRange>(null);
  const [rankings, setRankings] = useState<RankItem[]>([]);

  const fetchRankings = useCallback(async () => {
    if (!userId) return;
    try {
      const days = timeRange ?? undefined;
      const data =
        mode === 'global'
          ? await dal.toolUsage.getGlobalRanking(days)
          : await dal.toolUsage.getPersonalRanking(userId, days);
      setRankings(data);
    } catch (err) {
      console.error('Failed to load rankings:', err);
    }
  }, [userId, mode, timeRange]);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  const totalUses = rankings.reduce((sum, r) => sum + r.usage_count, 0);
  const maxCount = Math.max(...rankings.map((r) => r.usage_count), 1);

  const timeRanges: { label: string; value: TimeRange }[] = [
    { label: t('home.stats.timeRange.7d'), value: 7 },
    { label: t('home.stats.timeRange.30d'), value: 30 },
    { label: t('home.stats.timeRange.all'), value: null },
  ];

  return (
    <aside className="w-full lg:w-1/4 lg:sticky lg:top-4 lg:self-start">
      <div className="bg-base-100/70 backdrop-blur-sm rounded-2xl p-4">
        {/* Title */}
        <h3 className="text-lg font-bold mb-3 text-center">
          {t('home.stats.title')}
        </h3>

        {/* Mode toggle */}
        <div className="flex rounded-lg bg-base-200/50 p-0.5 mb-3">
          <button
            className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
              mode === 'global'
                ? 'bg-primary text-primary-content shadow-sm'
                : 'hover:bg-base-300/50'
            }`}
            onClick={() => setMode('global')}
          >
            {t('home.stats.globalRanking')}
          </button>
          <button
            className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
              mode === 'personal'
                ? 'bg-primary text-primary-content shadow-sm'
                : 'hover:bg-base-300/50'
            }`}
            onClick={() => setMode('personal')}
          >
            {t('home.stats.personalRanking')}
          </button>
        </div>

        {/* Time range tabs */}
        <div className="flex gap-1 mb-3">
          {timeRanges.map((tr) => (
            <button
              key={String(tr.value)}
              className={`flex-1 text-xs py-1 rounded-md transition-colors ${
                timeRange === tr.value
                  ? 'bg-base-300 font-semibold'
                  : 'hover:bg-base-200'
              }`}
              onClick={() => setTimeRange(tr.value)}
            >
              {tr.label}
            </button>
          ))}
        </div>

        {/* Summary */}
        <div className="mb-4 pb-3 border-b border-base-300/50">
          <div className="flex justify-between text-sm">
            <span className="opacity-70">{t('home.stats.totalUses')}</span>
            <span className="font-semibold">
              {totalUses} {t('home.stats.uses')}
            </span>
          </div>
        </div>

        {/* Rankings list (ascending = least at bottom, most at top) */}
        <div className="space-y-3">
          {rankings.length === 0 && (
            <p className="text-center text-sm opacity-50 py-4">--</p>
          )}
          {rankings.map((item) => {
            const meta = TOOL_META[item.tool_type];
            if (!meta) return null;
            const percentage = (item.usage_count / maxCount) * 100;
            return (
              <div
                key={item.tool_type}
                className="hover:bg-base-200/30 rounded-lg p-2 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{meta.icon}</span>
                    <span className="text-sm font-medium">
                      {t(meta.toolKey)}
                    </span>
                  </div>
                  <span className="text-xs opacity-60">
                    {item.usage_count} {t('home.stats.uses')}
                  </span>
                </div>
                <div className="h-1.5 bg-base-300/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full stat-bar"
                    style={
                      { '--stat-width': `${percentage}%` } as React.CSSProperties
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
