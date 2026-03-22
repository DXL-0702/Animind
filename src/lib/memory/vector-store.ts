import { dal } from '@/lib/dal';

// 生成向量嵌入（调用服务端API）
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch('/api/embedding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error('Embedding generation failed');
    }

    const data = await response.json();
    return data.embedding;
  } catch (error) {
    console.error('Embedding error:', error);
    throw error;
  }
}

// 存储记忆（自动生成embedding）
export async function storeMemory(
  characterId: string,
  userId: string,
  content: string,
  facts: string[],
  importance: number
): Promise<void> {
  const embedding = await generateEmbedding(content);

  await dal.memories.create({
    character_id: characterId,
    user_id: userId,
    content,
    facts,
    importance,
    embedding,
    access_count: 0,
    last_accessed_at: Date.now(),
    deleted_at: null,
  });
}

// 检索相关记忆（向量相似度搜索）
export async function retrieveRelevantMemories(
  characterId: string,
  query: string,
  topK: number = 5
): Promise<Array<{ content: string; facts: string[]; importance: number; similarity: number }>> {
  const queryEmbedding = await generateEmbedding(query);
  const memories = await dal.memories.search(characterId, queryEmbedding, topK);

  // 更新访问计数
  await Promise.all(memories.map(m => dal.memories.updateAccessCount(m.id)));

  return memories.map(m => ({
    content: m.content,
    facts: m.facts,
    importance: m.importance,
    similarity: 1.0, // DAL已经按相似度排序
  }));
}

// 获取最近记忆
export async function getRecentMemories(
  characterId: string,
  limit: number = 10
): Promise<Array<{ content: string; facts: string[] }>> {
  const memories = await dal.memories.getByCharacterId(characterId, {
    orderBy: 'created_at',
    orderDirection: 'desc',
    limit,
  });

  return memories.map(m => ({
    content: m.content,
    facts: m.facts,
  }));
}
