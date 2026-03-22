'use client';

import { useTranslation } from '@/hooks/useTranslation';
import ThemeMascot from '@/components/ui/ThemeMascot';

const SPARKLE_COLORS = ['#D4845C', '#E8A87C', '#C9A961'];

export default function MascotSidebar() {
  const { t } = useTranslation();

  return (
    <aside className="w-full lg:w-1/4 lg:sticky lg:top-4 lg:self-start">
      <div className="bg-base-100/70 backdrop-blur-sm rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-300">
        {/* Mascot */}
        <div className="flex justify-center mb-6">
          <ThemeMascot size="lg" />
        </div>

        {/* Greeting */}
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-primary mb-2">
            {t('home.mascot.greeting')}
          </h2>
          <p className="text-sm opacity-70">{t('home.mascot.role')}</p>
        </div>

        {/* Decorative sparkles */}
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
