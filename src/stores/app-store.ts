import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeName = 'animind';

export type Locale = 'zh-CN' | 'ja-JP';

interface AppState {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  userId: string | null;
  setUserId: (userId: string | null) => void;
  isAdmin: boolean;
  setIsAdmin: (v: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'animind',
      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        set({ theme });
      },
      locale: 'zh-CN',
      setLocale: (locale) => {
        document.documentElement.setAttribute('lang', locale);
        set({ locale });
      },
      userId: null,
      setUserId: (userId) => set({ userId }),
      isAdmin: false,
      setIsAdmin: (v) => set({ isAdmin: v }),
    }),
    {
      name: 'animind-app-store',
      partialize: (state) => ({
        theme: state.theme,
        locale: state.locale,
      }),
    }
  )
);
