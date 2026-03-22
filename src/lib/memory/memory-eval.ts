import { llmClient } from '@/lib/llm/client';
import { MEMORY_IMPORTANCE_PROMPT } from '@/lib/llm/prompts';
import { extractJSON } from '@/lib/utils/extract-json';

export interface MemoryEvaluation {
  importance_score: number;
  facts: string[];
  emotion_tags: string[];
  should_remember: boolean;
  reason: string;
}

// 评估对话内容的记忆价值
export async function evaluateMemoryImportance(
  conversationSnippet: string
): Promise<MemoryEvaluation> {
  try {
    const response = await llmClient.chat({
      messages: [
        { role: 'system', content: MEMORY_IMPORTANCE_PROMPT },
        { role: 'user', content: conversationSnippet },
      ],
      temperature: 0.3, // 低温度，保持评分一致性
      max_tokens: 500,
    });

    const evaluation: MemoryEvaluation = extractJSON<MemoryEvaluation>(response.content);
    return evaluation;
  } catch (error) {
    console.error('Memory evaluation failed:', error);
    // 返回默认评估
    return {
      importance_score: 0.5,
      facts: [],
      emotion_tags: [],
      should_remember: false,
      reason: 'Evaluation failed',
    };
  }
}

// 从对话中提取事实
export function extractFacts(evaluation: MemoryEvaluation): string[] {
  return evaluation.facts.filter(fact => fact.trim().length > 0);
}

// 判断是否应该存储记忆
export function shouldStoreMemory(evaluation: MemoryEvaluation): boolean {
  return evaluation.should_remember && evaluation.importance_score >= 0.5;
}
