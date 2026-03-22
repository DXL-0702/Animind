import { useAppStore } from '@/stores/app-store';
import { t } from '@/lib/i18n';

export function useTranslation() {
  const locale = useAppStore((state) => state.locale);
  return {
    t: (key: string) => t(key, locale),
    locale,
  };
}
