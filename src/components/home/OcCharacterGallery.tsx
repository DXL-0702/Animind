'use client';

import { useState, useEffect, useCallback } from 'react';
import { dal } from '@/lib/dal';
import { useTranslation } from '@/hooks/useTranslation';
import { useAppStore } from '@/stores/app-store';
import ThemeMascot from '@/components/ui/ThemeMascot';
import type { Character } from '@/lib/dal/types';

const SPARKLE_COLORS = ['#D4845C', '#E8A87C', '#C9A961'];

export default function OcCharacterGallery() {
  const { t } = useTranslation();
  const userId = useAppStore((s) => s.userId);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const chars = await dal.characters.getByUserId(userId, { orderBy: 'created_at', orderDirection: 'desc' });
      setCharacters(chars);
    } catch (e) {
      console.error('[Gallery] Failed to load characters:', e);
    } finally {
      setLoaded(true);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setLoaded(false);
      setCharacters([]);
      return;
    }
    load();
  }, [userId, load]);

  // Reload on window focus and visibilitychange (covers tab switch back)
  useEffect(() => {
    if (!userId) return;
    const onFocus = () => load();
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId, load]);

  // Reset image error state when switching characters
  useEffect(() => { setImgError(false); }, [currentIndex]);

  const current = characters[currentIndex] ?? null;

  const prev = () =>
    setCurrentIndex((i) => (i > 0 ? i - 1 : characters.length - 1));
  const next = () =>
    setCurrentIndex((i) => (i < characters.length - 1 ? i + 1 : 0));

  // Show mascot fallback when: not logged in yet, still loading, or no characters
  if (!userId || !loaded || characters.length === 0) {
    return (
      <aside className="w-full lg:w-1/4 lg:sticky lg:top-4 lg:self-start">
        <div className="bg-base-100/70 backdrop-blur-sm rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-300">
          <div className="flex justify-center mb-6">
            <ThemeMascot size="lg" />
          </div>
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-primary mb-2">
              {t('home.mascot.greeting')}
            </h2>
            <p className="text-sm opacity-70">
              {loaded ? t('home.gallery.empty') : t('home.mascot.role')}
            </p>
          </div>
          <div className="flex justify-center gap-3">
            {SPARKLE_COLORS.map((color, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full sparkle"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </aside>
    );
  }

  let personality: { core_traits?: string[] } = {};
  try {
    personality = JSON.parse(current?.personality || '{}');
  } catch { /* ignore */ }

  const hasValidImage = current?.image_url && !imgError;

  return (
    <aside className="w-full lg:w-1/4 lg:sticky lg:top-4 lg:self-start">
      <div className="bg-base-100/70 backdrop-blur-sm rounded-2xl p-4">
        {/* Character image or placeholder */}
        <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-3 bg-base-200 flex items-center justify-center">
          {hasValidImage ? (
            <img
              src={current.image_url!}
              alt={current.name}
              className="w-full h-full object-cover"
              onError={() => {
                console.warn('[Gallery] Image load failed:', current.image_url);
                setImgError(true);
              }}
            />
          ) : (
            <div className="text-center opacity-40">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <p className="text-xs mt-1">{current?.name}</p>
            </div>
          )}
        </div>

        {/* Character name + traits */}
        <div className="text-center mb-3">
          <h3 className="text-lg font-bold text-primary">{current?.name}</h3>
          {personality.core_traits && (
            <div className="flex flex-wrap justify-center gap-1 mt-1">
              {personality.core_traits.slice(0, 3).map((trait, i) => (
                <span key={i} className="badge badge-outline badge-sm">
                  {trait}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Navigation arrows */}
        {characters.length > 1 && (
          <div className="flex items-center justify-center gap-4 mb-3">
            <button
              className="btn btn-ghost btn-xs btn-circle"
              onClick={prev}
              aria-label={t('home.gallery.nav.prev')}
            >
              &lt;
            </button>
            <span className="text-xs opacity-60">
              {currentIndex + 1} / {characters.length}
            </span>
            <button
              className="btn btn-ghost btn-xs btn-circle"
              onClick={next}
              aria-label={t('home.gallery.nav.next')}
            >
              &gt;
            </button>
          </div>
        )}

        {/* Go to companion */}
        <a href="/companion" className="btn btn-primary btn-sm w-full">
          {t('home.gallery.viewCompanion')}
        </a>
      </div>
    </aside>
  );
}
