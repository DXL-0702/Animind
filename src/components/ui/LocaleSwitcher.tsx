'use client';

import { useAppStore } from '@/stores/app-store';

export default function LocaleSwitcher() {
  const { locale, setLocale } = useAppStore();

  const toggle = () => {
    setLocale(locale === 'zh-CN' ? 'ja-JP' : 'zh-CN');
  };

  return (
    <button
      className="btn btn-ghost btn-sm"
      onClick={toggle}
      aria-label={locale === 'zh-CN' ? '切换语言' : '言語切替'}
    >
      {locale === 'zh-CN' ? '日本語' : '中文'}
    </button>
  );
}
