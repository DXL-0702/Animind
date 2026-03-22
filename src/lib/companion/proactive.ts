import { dal } from '@/lib/dal';
import { llmClient } from '@/lib/llm/client';
import { extractJSON } from '@/lib/utils/extract-json';
import { PROACTIVE_MESSAGE_PROMPT } from '@/lib/llm/prompts';
import { getRecentMemories } from '@/lib/memory/vector-store';

// 主动行为冷却时间（小时）
const PROACTIVE_COOLDOWN_HOURS = 4;

// 检查是否应该主动搭话
export async function shouldInitiateProactive(
  characterId: string,
  userId: string
): Promise<boolean> {
  const relationship = await dal.relationships.getByCharacterAndUser(characterId, userId);
  if (!relationship) return false;

  const hoursSinceLastInteraction =
    (Date.now() - relationship.last_interaction_at) / (1000 * 60 * 60);

  // 只有达到"朋友"级别才会主动搭话
  if (relationship.trust_stage === 'stranger' || relationship.trust_stage === 'acquaintance') {
    return false;
  }

  // 超过冷却时间才主动
  return hoursSinceLastInteraction >= PROACTIVE_COOLDOWN_HOURS;
}

// 生成主动问候消息
export async function generateProactiveMessage(
  characterId: string,
  userId: string,
  locale: 'zh-CN' | 'ja-JP' = 'zh-CN'
): Promise<{ message: string; emotion: string } | null> {
  const character = await dal.characters.getById(characterId);
  const relationship = await dal.relationships.getByCharacterAndUser(characterId, userId);

  if (!character || !relationship) return null;

  const hoursSinceLastInteraction =
    (Date.now() - relationship.last_interaction_at) / (1000 * 60 * 60);

  // 获取最近话题
  const recentMemories = await getRecentMemories(characterId, 5);
  const recentTopics = recentMemories.flatMap(m => m.facts).slice(0, 3);

  // 判断时间段
  const hour = new Date().getHours();
  let timeOfDay = '早上';
  if (hour >= 12 && hour < 18) timeOfDay = '下午';
  else if (hour >= 18) timeOfDay = '晚上';

  try {
    const response = await llmClient.chat({
      messages: [
        {
          role: 'system',
          content: PROACTIVE_MESSAGE_PROMPT({
            characterName: character.name,
            lastInteractionHours: Math.floor(hoursSinceLastInteraction),
            timeOfDay,
            recentTopics,
          }, locale),
        },
        { role: 'user', content: '生成主动问候' },
      ],
      temperature: 0.8,
      max_tokens: 200,
    });

    const parsed = extractJSON<{ message: string; emotion: string }>(response.content);
    return {
      message: parsed.message,
      emotion: parsed.emotion,
    };
  } catch (error) {
    console.error('Proactive message generation failed:', error);
    return null;
  }
}

// 沉默检测（用户在页面但不说话）
export function detectSilence(lastUserMessageTime: number): boolean {
  const silenceMinutes = (Date.now() - lastUserMessageTime) / (1000 * 60);
  return silenceMinutes >= 5; // 5分钟沉默
}

// 生成沉默打破消息
export async function generateSilenceBreaker(characterId: string): Promise<string> {
  const character = await dal.characters.getById(characterId);
  if (!character) return '在想什么呢？';

  const silenceBreakerTemplates = [
    '在想什么呢？',
    '怎么不说话了？',
    '有什么心事吗？',
    '要不要聊聊天？',
    '我在这里哦~',
  ];

  return silenceBreakerTemplates[Math.floor(Math.random() * silenceBreakerTemplates.length)];
}
