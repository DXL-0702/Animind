'use client';

import { useTranslation } from '@/hooks/useTranslation';
import OcCharacterGallery from '@/components/home/OcCharacterGallery';
import ToolCardGrid from '@/components/home/ToolCardGrid';
import UsageStatsSidebar from '@/components/home/UsageStatsSidebar';

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen theme-bg">
      {/* Banner */}
      <div className="relative h-[50vh] min-h-[360px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-[center_30%]"
          style={{ backgroundImage: "url('/banner.png')" }}
        />
        <div className="absolute inset-0 banner-overlay" />
        <div className="relative z-10 flex items-center justify-center h-full">
          <header className="text-center px-4">
            <h1 className="text-4xl md:text-5xl font-bold mb-3 text-[#5C4033]">
              {t('home.hero.welcome')}
            </h1>
            <p className="text-lg text-[#5C4033]/70">{t('home.hero.desc')}</p>
          </header>
        </div>
      </div>

      {/* Three-column layout */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
          <OcCharacterGallery />
          <ToolCardGrid />
          <UsageStatsSidebar />
        </div>
      </main>
    </div>
  );
}
