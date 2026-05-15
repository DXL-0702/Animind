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
    label_zh: '红白巫女',
    label_ja: '紅白巫女',
    description_zh: '樱花粉白与巫女红交织的插画风格',
    description_ja: '桜の淡い白と巫女の赤が重なるイラストスタイル',
    mascotPath: '/mascots/animind.svg',
    gradientFrom: '#FFF8F8',
    gradientVia: '#FFF0F0',
    gradientTo: '#F5D8D8',
    colors: ['#D04050', '#F0D0D8', '#D8B050'],
  },
];
