import Dexie, { type EntityTable } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import type {
  User,
  Character,
  Message,
  Memory,
  Relationship,
  Creation,
  ToolUsage,
  DataExport,
} from './types';
import type {
  IUserService,
  ICharacterService,
  IMessageService,
  IMemoryService,
  IRelationshipService,
  ICreativeService,
  IDataExportService,
  IToolUsageService,
  IDataAccessLayer,
  QueryOptions,
} from './interfaces';

// Dexie数据库定义
class AnimindDB extends Dexie {
  users!: EntityTable<User, 'id'>;
  characters!: EntityTable<Character, 'id'>;
  messages!: EntityTable<Message, 'id'>;
  memories!: EntityTable<Memory, 'id'>;
  relationships!: EntityTable<Relationship, 'id'>;
  creations!: EntityTable<Creation, 'id'>;
  tool_usage!: EntityTable<ToolUsage, 'id'>;

  constructor() {
    super('AnimindDB');
    this.version(1).stores({
      users: 'id, nickname, created_at, deleted_at',
      characters: 'id, user_id, name, created_at, deleted_at',
      messages: 'id, character_id, user_id, role, created_at, deleted_at',
      memories: 'id, character_id, user_id, importance, created_at, deleted_at',
      relationships: 'id, character_id, user_id, trust_level, created_at, deleted_at',
      creations: 'id, user_id, type, created_at, deleted_at',
    });
    this.version(2).stores({
      users: 'id, nickname, created_at, deleted_at',
      characters: 'id, user_id, name, created_at, deleted_at',
      messages: 'id, character_id, user_id, role, created_at, deleted_at',
      memories: 'id, character_id, user_id, importance, created_at, deleted_at',
      relationships: 'id, character_id, user_id, trust_level, created_at, deleted_at',
      creations: 'id, user_id, type, created_at, deleted_at',
      tool_usage: 'id, user_id, tool_type, created_at',
    });
  }
}

const db = new AnimindDB();

// 工具函数：余弦相似度
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// 用户服务实现
class DexieUserService implements IUserService {
  async create(user: Omit<User, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<User> {
    const now = Date.now();
    const newUser: User = {
      ...user,
      id: user.id || uuidv4(),
      created_at: now,
      updated_at: now,
    };
    await db.users.add(newUser);
    return newUser;
  }

  async getById(id: string): Promise<User | null> {
    const user = await db.users.get(id);
    return user && !user.deleted_at ? user : null;
  }

  async update(id: string, data: Partial<User>): Promise<void> {
    await db.users.update(id, { ...data, updated_at: Date.now() });
  }

  async delete(id: string): Promise<void> {
    await db.users.update(id, { deleted_at: Date.now() });
  }
}

// 角色服务实现
class DexieCharacterService implements ICharacterService {
  async create(character: Omit<Character, 'id' | 'created_at' | 'updated_at'>): Promise<Character> {
    const now = Date.now();
    const newCharacter: Character = {
      ...character,
      id: uuidv4(),
      created_at: now,
      updated_at: now,
    };
    await db.characters.add(newCharacter);
    return newCharacter;
  }

  async getById(id: string): Promise<Character | null> {
    const character = await db.characters.get(id);
    return character && !character.deleted_at ? character : null;
  }

  async getByUserId(userId: string, options?: QueryOptions): Promise<Character[]> {
    let query = db.characters.where('user_id').equals(userId).and(c => !c.deleted_at);

    let results = await query.toArray();

    if (options?.orderBy) {
      results.sort((a, b) => {
        const aVal = a[options.orderBy as keyof Character] ?? '';
        const bVal = b[options.orderBy as keyof Character] ?? '';
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
        return 0;
      });
    }

    if (options?.orderDirection === 'desc') {
      results.reverse();
    }

    if (options?.offset) {
      results.splice(0, options.offset);
    }

    if (options?.limit) {
      return results.slice(0, options.limit);
    }

    return results;
  }

  async update(id: string, data: Partial<Character>): Promise<void> {
    await db.characters.update(id, { ...data, updated_at: Date.now() });
  }

  async delete(id: string): Promise<void> {
    await db.characters.update(id, { deleted_at: Date.now() });
  }
}

// 消息服务实现
class DexieMessageService implements IMessageService {
  async create(message: Omit<Message, 'id' | 'created_at'>): Promise<Message> {
    const newMessage: Message = {
      ...message,
      id: uuidv4(),
      created_at: Date.now(),
    };
    await db.messages.add(newMessage);
    return newMessage;
  }

  async getById(id: string): Promise<Message | null> {
    const message = await db.messages.get(id);
    return message && !message.deleted_at ? message : null;
  }

  async getByCharacterId(characterId: string, options?: QueryOptions): Promise<Message[]> {
    const query = db.messages.where('character_id').equals(characterId).and(m => !m.deleted_at);

    let results: Message[];
    if (options?.orderBy) {
      results = await query.sortBy(options.orderBy);
    } else {
      results = await query.toArray();
    }

    if (options?.orderDirection === 'desc') {
      results.reverse();
    }

    if (options?.offset) {
      results.splice(0, options.offset);
    }

    if (options?.limit) {
      return results.slice(0, options.limit);
    }

    return results;
  }

  async delete(id: string): Promise<void> {
    await db.messages.update(id, { deleted_at: Date.now() });
  }

  async deleteByCharacterId(characterId: string): Promise<void> {
    const messages = await db.messages.where('character_id').equals(characterId).toArray();
    await Promise.all(messages.map(m => db.messages.update(m.id, { deleted_at: Date.now() })));
  }
}

// 记忆服务实现
class DexieMemoryService implements IMemoryService {
  async create(memory: Omit<Memory, 'id' | 'created_at'>): Promise<Memory> {
    const newMemory: Memory = {
      ...memory,
      id: uuidv4(),
      created_at: Date.now(),
    };
    await db.memories.add(newMemory);
    return newMemory;
  }

  async getById(id: string): Promise<Memory | null> {
    const memory = await db.memories.get(id);
    return memory && !memory.deleted_at ? memory : null;
  }

  async getByCharacterId(characterId: string, options?: QueryOptions): Promise<Memory[]> {
    const query = db.memories.where('character_id').equals(characterId).and(m => !m.deleted_at);

    let results: Memory[];
    if (options?.orderBy) {
      results = await query.sortBy(options.orderBy);
    } else {
      results = await query.toArray();
    }

    if (options?.orderDirection === 'desc') {
      results.reverse();
    }

    if (options?.offset) {
      results.splice(0, options.offset);
    }

    if (options?.limit) {
      return results.slice(0, options.limit);
    }

    return results;
  }

  async search(characterId: string, queryEmbedding: number[], topK: number = 5): Promise<Memory[]> {
    const memories = await db.memories
      .where('character_id')
      .equals(characterId)
      .and(m => !m.deleted_at)
      .toArray();

    const scored = memories.map(memory => ({
      memory,
      score: cosineSimilarity(queryEmbedding, memory.embedding),
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK).map(item => item.memory);
  }

  async updateAccessCount(id: string): Promise<void> {
    const memory = await db.memories.get(id);
    if (memory) {
      await db.memories.update(id, {
        access_count: memory.access_count + 1,
        last_accessed_at: Date.now(),
      });
    }
  }

  async update(id: string, data: Partial<Memory>): Promise<void> {
    await db.memories.update(id, data);
  }

  async delete(id: string): Promise<void> {
    await db.memories.update(id, { deleted_at: Date.now() });
  }
}

// 关系服务实现
class DexieRelationshipService implements IRelationshipService {
  async create(relationship: Omit<Relationship, 'id' | 'created_at' | 'updated_at'>): Promise<Relationship> {
    const now = Date.now();
    const newRelationship: Relationship = {
      ...relationship,
      id: uuidv4(),
      created_at: now,
      updated_at: now,
    };
    await db.relationships.add(newRelationship);
    return newRelationship;
  }

  async getById(id: string): Promise<Relationship | null> {
    const relationship = await db.relationships.get(id);
    return relationship && !relationship.deleted_at ? relationship : null;
  }

  async getByCharacterAndUser(characterId: string, userId: string): Promise<Relationship | null> {
    const relationship = await db.relationships
      .where('character_id')
      .equals(characterId)
      .and(r => r.user_id === userId && !r.deleted_at)
      .first();
    return relationship || null;
  }

  async update(id: string, data: Partial<Relationship>): Promise<void> {
    await db.relationships.update(id, { ...data, updated_at: Date.now() });
  }

  async delete(id: string): Promise<void> {
    await db.relationships.update(id, { deleted_at: Date.now() });
  }
}

// 创作服务实现
class DexieCreativeService implements ICreativeService {
  async create(creation: Omit<Creation, 'id' | 'created_at'>): Promise<Creation> {
    const newCreation: Creation = {
      ...creation,
      id: uuidv4(),
      created_at: Date.now(),
    };
    await db.creations.add(newCreation);
    return newCreation;
  }

  async getById(id: string): Promise<Creation | null> {
    const creation = await db.creations.get(id);
    return creation && !creation.deleted_at ? creation : null;
  }

  async getByUserId(userId: string, options?: QueryOptions): Promise<Creation[]> {
    const query = db.creations.where('user_id').equals(userId).and(c => !c.deleted_at);

    let results: Creation[];
    if (options?.orderBy) {
      results = await query.sortBy(options.orderBy);
    } else {
      results = await query.toArray();
    }

    if (options?.orderDirection === 'desc') {
      results.reverse();
    }

    if (options?.offset) {
      results.splice(0, options.offset);
    }

    if (options?.limit) {
      return results.slice(0, options.limit);
    }

    return results;
  }

  async getByType(userId: string, type: Creation['type'], options?: QueryOptions): Promise<Creation[]> {
    const query = db.creations
      .where('user_id')
      .equals(userId)
      .and(c => c.type === type && !c.deleted_at);

    let results: Creation[];
    if (options?.orderBy) {
      results = await query.sortBy(options.orderBy);
    } else {
      results = await query.toArray();
    }

    if (options?.orderDirection === 'desc') {
      results.reverse();
    }

    if (options?.offset) {
      results.splice(0, options.offset);
    }

    if (options?.limit) {
      return results.slice(0, options.limit);
    }

    return results;
  }

  async delete(id: string): Promise<void> {
    await db.creations.update(id, { deleted_at: Date.now() });
  }
}

// 数据导出/导入服务实现
class DexieDataExportService implements IDataExportService {
  async exportAll(): Promise<DataExport> {
    const [users, characters, messages, memories, relationships, creations] = await Promise.all([
      db.users.toArray(),
      db.characters.toArray(),
      db.messages.toArray(),
      db.memories.toArray(),
      db.relationships.toArray(),
      db.creations.toArray(),
    ]);

    return {
      version: '1.0',
      exported_at: Date.now(),
      users,
      characters,
      messages,
      memories,
      relationships,
      creations,
    };
  }

  async importAll(data: DataExport): Promise<void> {
    await db.transaction('rw', [db.users, db.characters, db.messages, db.memories, db.relationships, db.creations], async () => {
      // 清空现有数据
      await Promise.all([
        db.users.clear(),
        db.characters.clear(),
        db.messages.clear(),
        db.memories.clear(),
        db.relationships.clear(),
        db.creations.clear(),
      ]);

      // 导入新数据
      await Promise.all([
        db.users.bulkAdd(data.users),
        db.characters.bulkAdd(data.characters),
        db.messages.bulkAdd(data.messages),
        db.memories.bulkAdd(data.memories),
        db.relationships.bulkAdd(data.relationships),
        db.creations.bulkAdd(data.creations),
      ]);
    });
  }
}

// 工具使用统计服务实现
class DexieToolUsageService implements IToolUsageService {
  async record(userId: string, toolType: ToolUsage['tool_type']): Promise<void> {
    await db.tool_usage.add({
      id: uuidv4(),
      user_id: userId,
      tool_type: toolType,
      created_at: Date.now(),
    });
  }

  async getGlobalRanking(days?: number): Promise<{ tool_type: string; usage_count: number }[]> {
    // Local Dexie = single user, so global === personal
    return this._aggregate(days);
  }

  async getPersonalRanking(userId: string, days?: number): Promise<{ tool_type: string; usage_count: number }[]> {
    return this._aggregate(days, userId);
  }

  private async _aggregate(days?: number, userId?: string): Promise<{ tool_type: string; usage_count: number }[]> {
    let collection = db.tool_usage.toCollection();

    const items = await collection.toArray();
    const cutoff = days ? Date.now() - days * 86400000 : 0;

    const counts: Record<string, number> = {};
    for (const item of items) {
      if (days && item.created_at < cutoff) continue;
      if (userId && item.user_id !== userId) continue;
      counts[item.tool_type] = (counts[item.tool_type] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([tool_type, usage_count]) => ({ tool_type, usage_count }))
      .sort((a, b) => a.usage_count - b.usage_count);
  }
}

// 导出完整DAL实现
export const dexieProvider: IDataAccessLayer = {
  users: new DexieUserService(),
  characters: new DexieCharacterService(),
  messages: new DexieMessageService(),
  memories: new DexieMemoryService(),
  relationships: new DexieRelationshipService(),
  creations: new DexieCreativeService(),
  dataExport: new DexieDataExportService(),
  toolUsage: new DexieToolUsageService(),
};

