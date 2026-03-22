import type { ThemeName } from '@/stores/app-store';

export interface ThemeMeta {
  id: ThemeName;
  label_zh: string;
  label_ja: string;
  description_zh: string;
  description_ja: string;
  mascotPath: string;
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
  colors: [string, string, string];
}

export const THEMES: ThemeMeta[] = [
  {
    id: 'animind',
    label_zh: '暖光日系',
    label_ja: 'ウォーム和風',
    description_zh: '温暖柔和的日系插画风格',
    description_ja: '温かく柔らかな和風イラストスタイル',
    mascotPath: '/mascots/animind.svg',
    gradientFrom: '#FFF8F0',
    gradientVia: '#FFF0E0',
    gradientTo: '#F5E1CC',
    colors: ['#D4845C', '#E8A87C', '#C9A961'],
  },
];
