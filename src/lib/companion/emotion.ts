import { dal } from '@/lib/dal';

export type EmotionType =
  | 'happy'
  | 'sad'
  | 'angry'
  | 'excited'
  | 'nervous'
  | 'calm'
  | 'surprised'
  | 'confused'
  | 'neutral';

export interface EmotionState {
  emotion: EmotionType;
  intensity: number; // 0-1
}

// 情感衰减速率（每小时）
const EMOTION_DECAY_RATE = 0.1;

// 更新情感状态
export async function updateEmotion(
  relationshipId: string,
  newEmotion: EmotionType,
  intensity: number
): Promise<void> {
  await dal.relationships.update(relationshipId, {
    emotion_state: newEmotion,
    emotion_intensity: Math.max(0, Math.min(1, intensity)),
  });
}

// 情感衰减（随时间回归中性）
export async function decayEmotion(relationshipId: string): Promise<void> {
  const relationship = await dal.relationships.getById(relationshipId);
  if (!relationship) return;

  const hoursSinceLastInteraction =
    (Date.now() - relationship.last_interaction_at) / (1000 * 60 * 60);

  const decayAmount = hoursSinceLastInteraction * EMOTION_DECAY_RATE;
  const newIntensity = Math.max(0, relationship.emotion_intensity - decayAmount);

  // 强度降到0.2以下时回归neutral
  if (newIntensity < 0.2) {
    await updateEmotion(relationshipId, 'neutral', 0.5);
  } else {
    await dal.relationships.update(relationshipId, {
      emotion_intensity: newIntensity,
    });
  }
}

// 获取情感emoji
export function getEmotionEmoji(emotion: EmotionType): string {
  const emojis: Record<EmotionType, string> = {
    happy: '😊',
    sad: '😢',
    angry: '😠',
    excited: '🤩',
    nervous: '😰',
    calm: '😌',
    surprised: '😲',
    confused: '😕',
    neutral: '😐',
  };
  return emojis[emotion];
}

// 获取情感描述
export function getEmotionDescription(emotion: EmotionType, intensity: number): string {
  const intensityLevel = intensity > 0.7 ? '非常' : intensity > 0.4 ? '有点' : '略微';

  const descriptions: Record<EmotionType, string> = {
    happy: `${intensityLevel}开心`,
    sad: `${intensityLevel}难过`,
    angry: `${intensityLevel}生气`,
    excited: `${intensityLevel}兴奋`,
    nervous: `${intensityLevel}紧张`,
    calm: `${intensityLevel}平静`,
    surprised: `${intensityLevel}惊讶`,
    confused: `${intensityLevel}困惑`,
    neutral: '平静',
  };

  return descriptions[emotion];
}

// 情感转换规则（某些情感更容易转换）
export function canTransitionTo(from: EmotionType, to: EmotionType): boolean {
  // 定义不太可能的情感转换
  const unlikelyTransitions: Array<[EmotionType, EmotionType]> = [
    ['angry', 'happy'],
    ['sad', 'excited'],
    ['happy', 'angry'],
  ];

  return !unlikelyTransitions.some(([f, t]) => f === from && t === to);
}
