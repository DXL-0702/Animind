import type { Locale } from '@/stores/app-store';

// === Voice Option types (for voice selector UI) ===

export interface VoiceOption {
  id: string;
  nameZh: string;
  nameJa: string;
  voiceType: string;
  locale: 'zh-CN' | 'ja-JP';
  style: string;
  styleJa: string;
}

export const ZH_VOICE_OPTIONS: VoiceOption[] = [
  { id: 'zh-f-cancan',   nameZh: '灿灿',   nameJa: '灿灿',   voiceType: 'BV700_V2_streaming', locale: 'zh-CN', style: '活泼甜美', styleJa: '明るく甘い' },
  { id: 'zh-f-general',  nameZh: '通用女声', nameJa: '通用女声', voiceType: 'BV001_V2_streaming', locale: 'zh-CN', style: '清晰自然', styleJa: 'クリア・自然' },
  { id: 'zh-f-xiaoxiao', nameZh: '晓晓',   nameJa: '晓晓',   voiceType: 'BV034_streaming',    locale: 'zh-CN', style: '清甜少女', styleJa: '清楚な少女' },
  { id: 'zh-f-shuang',   nameZh: '思思',   nameJa: '思思',   voiceType: 'BV406_V2_streaming', locale: 'zh-CN', style: '干练爽朗', styleJa: 'テキパキ' },
  { id: 'zh-f-meng',     nameZh: '悦悦',   nameJa: '悦悦',   voiceType: 'BV426_streaming',    locale: 'zh-CN', style: '可爱甜萌', styleJa: 'かわいい' },
  { id: 'zh-f-qingrou',  nameZh: '小雨',   nameJa: '小雨',   voiceType: 'BV007_streaming',    locale: 'zh-CN', style: '柔和温婉', styleJa: '優しい・穏やか' },
  { id: 'zh-f-cool',     nameZh: '冰山',   nameJa: '冰山',   voiceType: 'BV113_streaming',    locale: 'zh-CN', style: '冷静知性', styleJa: 'クール・知的' },
  { id: 'zh-f-lively',   nameZh: '阳光',   nameJa: '阳光',   voiceType: 'BV100_streaming',    locale: 'zh-CN', style: '元气开朗', styleJa: '元気・明るい' },
];

export const JA_VOICE_OPTIONS: VoiceOption[] = [
  { id: 'ja-f-moe',       nameZh: '萌系少女',  nameJa: '萌えっ娘',     voiceType: 'BV521_streaming', locale: 'ja-JP', style: '可爱萌系',   styleJa: 'かわいい系' },
  { id: 'ja-f-elegant',   nameZh: '气质女声',  nameJa: '気品女声',     voiceType: 'BV522_streaming', locale: 'ja-JP', style: '优雅成熟',   styleJa: '上品・成熟' },
  { id: 'ja-f-energetic', nameZh: '元气少女',  nameJa: '元気っ娘',     voiceType: 'BV520_streaming', locale: 'ja-JP', style: '活泼元气',   styleJa: '元気・活発' },
  { id: 'ja-f-cancan',    nameZh: '灿灿(日)',  nameJa: '灿灿(日本語)', voiceType: 'BV700_streaming', locale: 'ja-JP', style: '自然流畅',   styleJa: '自然・流暢' },
  { id: 'ja-m-keita',     nameZh: '日语男声',  nameJa: '日本語男声',   voiceType: 'BV524_streaming', locale: 'ja-JP', style: '标准男声',   styleJa: 'スタンダード' },
];

/** Get voice options for a given locale */
export function getVoiceOptionsForLocale(locale: Locale): VoiceOption[] {
  return locale === 'ja-JP' ? JA_VOICE_OPTIONS : ZH_VOICE_OPTIONS;
}

/** Get the doubao voice_type string by voice option ID */
export function getVoiceTypeById(voiceId: string, locale: Locale): string {
  const options = locale === 'ja-JP' ? JA_VOICE_OPTIONS : ZH_VOICE_OPTIONS;
  return options.find(v => v.id === voiceId)?.voiceType
    ?? (locale === 'ja-JP' ? 'BV521_streaming' : 'BV700_V2_streaming');
}

/** Get default voice ID for a locale */
export function getDefaultVoiceId(locale: Locale): string {
  return locale === 'ja-JP' ? JA_VOICE_OPTIONS[0].id : ZH_VOICE_OPTIONS[0].id;
}

// === Legacy tone-voice mapping (kept for backward compat with companion) ===

interface VoiceConfig {
  voice: string;
  pitch: string;
  rate: string;
  volume: string;
}

const zhMap: Record<string, VoiceConfig> = {
  '傲娇': { voice: 'zh-CN-XiaoyiNeural', pitch: '+10%', rate: '+5%', volume: '+0%' },
  '温柔': { voice: 'zh-CN-XiaoxiaoNeural', pitch: '-5%', rate: '-10%', volume: '+0%' },
  '中二': { voice: 'zh-CN-YunxiNeural', pitch: '+15%', rate: '+10%', volume: '+0%' },
  '毒舌': { voice: 'zh-CN-YunjianNeural', pitch: '+0%', rate: '+5%', volume: '+0%' },
  '天然呆': { voice: 'zh-CN-XiaoxiaoNeural', pitch: '+5%', rate: '-15%', volume: '+0%' },
  '冷酷': { voice: 'zh-CN-YunjianNeural', pitch: '-10%', rate: '-5%', volume: '+0%' },
  '元气': { voice: 'zh-CN-XiaoyiNeural', pitch: '+15%', rate: '+15%', volume: '+0%' },
  '病娇': { voice: 'zh-CN-XiaoxiaoNeural', pitch: '-5%', rate: '-5%', volume: '-10%' },
};

const jaMap: Record<string, VoiceConfig> = {
  'ツンデレ': { voice: 'ja-JP-NanamiNeural', pitch: '+10%', rate: '+5%', volume: '+0%' },
  '優しい': { voice: 'ja-JP-NanamiNeural', pitch: '-5%', rate: '-10%', volume: '+0%' },
  '中二病': { voice: 'ja-JP-KeitaNeural', pitch: '+15%', rate: '+10%', volume: '+0%' },
  '毒舌': { voice: 'ja-JP-DaichiNeural', pitch: '+0%', rate: '+5%', volume: '+0%' },
  '天然': { voice: 'ja-JP-NanamiNeural', pitch: '+5%', rate: '-15%', volume: '+0%' },
  'クール': { voice: 'ja-JP-NanamiNeural', pitch: '-10%', rate: '-5%', volume: '+0%' },
  '元気': { voice: 'ja-JP-NanamiNeural', pitch: '+15%', rate: '+15%', volume: '+0%' },
  'ヤンデレ': { voice: 'ja-JP-NanamiNeural', pitch: '-5%', rate: '-5%', volume: '-10%' },
};

const toneKeyToZh: Record<string, string> = {
  'tone.tsundere': '傲娇',
  'tone.gentle': '温柔',
  'tone.chuuni': '中二',
  'tone.sharp': '毒舌',
  'tone.airhead': '天然呆',
  'tone.cool': '冷酷',
  'tone.genki': '元气',
  'tone.yandere': '病娇',
};

const toneKeyToJa: Record<string, string> = {
  'tone.tsundere': 'ツンデレ',
  'tone.gentle': '優しい',
  'tone.chuuni': '中二病',
  'tone.sharp': '毒舌',
  'tone.airhead': '天然',
  'tone.cool': 'クール',
  'tone.genki': '元気',
  'tone.yandere': 'ヤンデレ',
};

export function getVoiceConfig(toneKey: string, locale: Locale): VoiceConfig {
  if (locale === 'ja-JP') {
    const jaTone = toneKeyToJa[toneKey] ?? toneKey;
    return jaMap[jaTone] ?? jaMap['ツンデレ'];
  }
  const zhTone = toneKeyToZh[toneKey] ?? toneKey;
  return zhMap[zhTone] ?? zhMap['傲娇'];
}

export const TONE_KEYS = [
  'tone.tsundere',
  'tone.gentle',
  'tone.chuuni',
  'tone.sharp',
  'tone.airhead',
  'tone.cool',
  'tone.genki',
  'tone.yandere',
] as const;

export type ToneKey = (typeof TONE_KEYS)[number];
