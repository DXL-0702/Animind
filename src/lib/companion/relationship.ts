import { dal } from '@/lib/dal';
import type { Relationship } from '@/lib/dal/types';

export type TrustStage = 'stranger' | 'acquaintance' | 'friend' | 'close_friend' | 'master';

// 信任等级阈值
const TRUST_THRESHOLDS = {
  stranger: 0,
  acquaintance: 20,
  friend: 40,
  close_friend: 60,
  master: 80,
};

// 根据信任值计算信任阶段
export function calculateTrustStage(trustLevel: number): TrustStage {
  if (trustLevel >= TRUST_THRESHOLDS.master) return 'master';
  if (trustLevel >= TRUST_THRESHOLDS.close_friend) return 'close_friend';
  if (trustLevel >= TRUST_THRESHOLDS.friend) return 'friend';
  if (trustLevel >= TRUST_THRESHOLDS.acquaintance) return 'acquaintance';
  return 'stranger';
}

// 获取或创建关系
export async function getOrCreateRelationship(
  characterId: string,
  userId: string
): Promise<Relationship> {
  let relationship = await dal.relationships.getByCharacterAndUser(characterId, userId);

  if (!relationship) {
    relationship = await dal.relationships.create({
      character_id: characterId,
      user_id: userId,
      trust_level: 0,
      trust_stage: 'stranger',
      emotion_state: 'neutral',
      emotion_intensity: 0.5,
      total_messages: 0,
      last_interaction_at: Date.now(),
      deleted_at: null,
    });
  }

  return relationship;
}

// 更新信任值
export async function updateTrust(
  relationshipId: string,
  trustChange: number
): Promise<void> {
  const relationship = await dal.relationships.getById(relationshipId);
  if (!relationship) return;

  const newTrustLevel = Math.max(0, Math.min(100, relationship.trust_level + trustChange));
  const newTrustStage = calculateTrustStage(newTrustLevel);

  await dal.relationships.update(relationshipId, {
    trust_level: newTrustLevel,
    trust_stage: newTrustStage,
  });
}

// 记录互动
export async function recordInteraction(
  relationshipId: string,
  trustChange: number = 0
): Promise<void> {
  const relationship = await dal.relationships.getById(relationshipId);
  if (!relationship) return;

  await dal.relationships.update(relationshipId, {
    total_messages: relationship.total_messages + 1,
    last_interaction_at: Date.now(),
  });

  if (trustChange !== 0) {
    await updateTrust(relationshipId, trustChange);
  }
}

// 获取信任阶段描述
export function getTrustStageDescription(stage: TrustStage): string {
  const descriptions = {
    stranger: '陌生人 - 保持礼貌距离',
    acquaintance: '熟人 - 开始熟悉',
    friend: '朋友 - 互相信任',
    close_friend: '挚友 - 深度了解',
    master: '主人 - 完全信赖',
  };
  return descriptions[stage];
}

// 获取信任阶段对应的语气调整
export function getTrustToneModifier(stage: TrustStage): string {
  const modifiers = {
    stranger: '保持礼貌和距离感，使用敬语',
    acquaintance: '友好但不过分亲密，偶尔开玩笑',
    friend: '轻松自然，可以分享个人想法',
    close_friend: '亲密无间，可以撒娇或吐槽',
    master: '完全放松，展现真实自我，偶尔依赖',
  };
  return modifiers[stage];
}
