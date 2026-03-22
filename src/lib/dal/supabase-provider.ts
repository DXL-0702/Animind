import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type {
  User,
  Character,
  Message,
  Memory,
  Relationship,
  Creation,
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

function getClient() {
  return getSupabaseBrowserClient();
}

function applyQueryOptions<T extends Record<string, unknown>>(
  query: any,
  options?: QueryOptions
) {
  if (options?.orderBy) {
    query = query.order(options.orderBy, {
      ascending: options.orderDirection !== 'desc',
    });
  }
  if (options?.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit || 1000) - 1
    );
  } else if (options?.limit) {
    query = query.limit(options.limit);
  }
  return query;
}

// ─── User Service ───────────────────────────────────────
class SupabaseUserService implements IUserService {
  async create(
    user: Omit<User, 'id' | 'created_at' | 'updated_at'> & { id?: string }
  ): Promise<User> {
    const now = Date.now();
    const row = {
      ...(user.id ? { id: user.id } : {}),
      nickname: user.nickname,
      created_at: now,
      updated_at: now,
      deleted_at: user.deleted_at ?? null,
    };
    const { data, error } = await getClient()
      .from('users')
      .upsert(row)
      .select()
      .single();
    if (error) throw error;
    return data as User;
  }

  async getById(id: string): Promise<User | null> {
    const { data, error } = await getClient()
      .from('users')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();
    if (error) throw error;
    return data as User | null;
  }

  async update(id: string, data: Partial<User>): Promise<void> {
    const { error } = await getClient()
      .from('users')
      .update({ ...data, updated_at: Date.now() })
      .eq('id', id);
    if (error) throw error;
  }

  async delete(id: string): Promise<void> {
    const { error } = await getClient()
      .from('users')
      .update({ deleted_at: Date.now() })
      .eq('id', id);
    if (error) throw error;
  }
}

// ─── Character Service ──────────────────────────────────
class SupabaseCharacterService implements ICharacterService {
  async create(
    character: Omit<Character, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Character> {
    const now = Date.now();
    const { data, error } = await getClient()
      .from('characters')
      .insert({
        user_id: character.user_id,
        name: character.name,
        personality: character.personality,
        appearance: character.appearance,
        backstory: character.backstory,
        image_url: character.image_url,
        voice_id: character.voice_id,
        created_at: now,
        updated_at: now,
        deleted_at: character.deleted_at ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as Character;
  }

  async getById(id: string): Promise<Character | null> {
    const { data, error } = await getClient()
      .from('characters')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();
    if (error) throw error;
    return data as Character | null;
  }

  async getByUserId(
    userId: string,
    options?: QueryOptions
  ): Promise<Character[]> {
    let query = getClient()
      .from('characters')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null);
    query = applyQueryOptions(query, options);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Character[];
  }

  async update(id: string, data: Partial<Character>): Promise<void> {
    const { error } = await getClient()
      .from('characters')
      .update({ ...data, updated_at: Date.now() })
      .eq('id', id);
    if (error) throw error;
  }

  async delete(id: string): Promise<void> {
    const { error } = await getClient()
      .from('characters')
      .update({ deleted_at: Date.now() })
      .eq('id', id);
    if (error) throw error;
  }
}

// ─── Message Service ────────────────────────────────────
class SupabaseMessageService implements IMessageService {
  async create(
    message: Omit<Message, 'id' | 'created_at'>
  ): Promise<Message> {
    const { data, error } = await getClient()
      .from('messages')
      .insert({
        character_id: message.character_id,
        user_id: message.user_id,
        role: message.role,
        content: message.content,
        emotion: message.emotion,
        created_at: Date.now(),
        deleted_at: message.deleted_at ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as Message;
  }

  async getById(id: string): Promise<Message | null> {
    const { data, error } = await getClient()
      .from('messages')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();
    if (error) throw error;
    return data as Message | null;
  }

  async getByCharacterId(
    characterId: string,
    options?: QueryOptions
  ): Promise<Message[]> {
    let query = getClient()
      .from('messages')
      .select('*')
      .eq('character_id', characterId)
      .is('deleted_at', null);
    query = applyQueryOptions(query, options);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Message[];
  }

  async delete(id: string): Promise<void> {
    const { error } = await getClient()
      .from('messages')
      .update({ deleted_at: Date.now() })
      .eq('id', id);
    if (error) throw error;
  }

  async deleteByCharacterId(characterId: string): Promise<void> {
    const { error } = await getClient()
      .from('messages')
      .update({ deleted_at: Date.now() })
      .eq('character_id', characterId)
      .is('deleted_at', null);
    if (error) throw error;
  }
}

// ─── Memory Service ─────────────────────────────────────
class SupabaseMemoryService implements IMemoryService {
  async create(
    memory: Omit<Memory, 'id' | 'created_at'>
  ): Promise<Memory> {
    const { data, error } = await getClient()
      .from('memories')
      .insert({
        character_id: memory.character_id,
        user_id: memory.user_id,
        content: memory.content,
        facts: memory.facts,
        importance: memory.importance,
        embedding: memory.embedding,
        access_count: memory.access_count,
        last_accessed_at: memory.last_accessed_at,
        created_at: Date.now(),
        deleted_at: memory.deleted_at ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as Memory;
  }

  async getById(id: string): Promise<Memory | null> {
    const { data, error } = await getClient()
      .from('memories')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();
    if (error) throw error;
    return data as Memory | null;
  }

  async getByCharacterId(
    characterId: string,
    options?: QueryOptions
  ): Promise<Memory[]> {
    let query = getClient()
      .from('memories')
      .select('*')
      .eq('character_id', characterId)
      .is('deleted_at', null);
    query = applyQueryOptions(query, options);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Memory[];
  }

  async search(
    characterId: string,
    queryEmbedding: number[],
    topK: number = 5
  ): Promise<Memory[]> {
    // Use the search_memories RPC that leverages pgvector
    const { data, error } = await getClient().rpc('search_memories', {
      p_character_id: characterId,
      p_query_embedding: queryEmbedding,
      p_top_k: topK,
    });
    if (error) throw error;
    return (data ?? []) as Memory[];
  }

  async updateAccessCount(id: string): Promise<void> {
    // Use raw SQL via RPC or read-then-update
    const { data: memory, error: readErr } = await getClient()
      .from('memories')
      .select('access_count')
      .eq('id', id)
      .single();
    if (readErr) throw readErr;

    const { error } = await getClient()
      .from('memories')
      .update({
        access_count: (memory?.access_count ?? 0) + 1,
        last_accessed_at: Date.now(),
      })
      .eq('id', id);
    if (error) throw error;
  }

  async update(id: string, data: Partial<Memory>): Promise<void> {
    const { error } = await getClient()
      .from('memories')
      .update(data)
      .eq('id', id);
    if (error) throw error;
  }

  async delete(id: string): Promise<void> {
    const { error } = await getClient()
      .from('memories')
      .update({ deleted_at: Date.now() })
      .eq('id', id);
    if (error) throw error;
  }
}

// ─── Relationship Service ───────────────────────────────
class SupabaseRelationshipService implements IRelationshipService {
  async create(
    relationship: Omit<Relationship, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Relationship> {
    const now = Date.now();
    const { data, error } = await getClient()
      .from('relationships')
      .insert({
        character_id: relationship.character_id,
        user_id: relationship.user_id,
        trust_level: relationship.trust_level,
        trust_stage: relationship.trust_stage,
        emotion_state: relationship.emotion_state,
        emotion_intensity: relationship.emotion_intensity,
        total_messages: relationship.total_messages,
        last_interaction_at: relationship.last_interaction_at,
        created_at: now,
        updated_at: now,
        deleted_at: relationship.deleted_at ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as Relationship;
  }

  async getById(id: string): Promise<Relationship | null> {
    const { data, error } = await getClient()
      .from('relationships')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();
    if (error) throw error;
    return data as Relationship | null;
  }

  async getByCharacterAndUser(
    characterId: string,
    userId: string
  ): Promise<Relationship | null> {
    const { data, error } = await getClient()
      .from('relationships')
      .select('*')
      .eq('character_id', characterId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle();
    if (error) throw error;
    return data as Relationship | null;
  }

  async update(id: string, data: Partial<Relationship>): Promise<void> {
    const { error } = await getClient()
      .from('relationships')
      .update({ ...data, updated_at: Date.now() })
      .eq('id', id);
    if (error) throw error;
  }

  async delete(id: string): Promise<void> {
    const { error } = await getClient()
      .from('relationships')
      .update({ deleted_at: Date.now() })
      .eq('id', id);
    if (error) throw error;
  }
}

// ─── Creative Service ───────────────────────────────────
class SupabaseCreativeService implements ICreativeService {
  async create(
    creation: Omit<Creation, 'id' | 'created_at'>
  ): Promise<Creation> {
    const { data, error } = await getClient()
      .from('creations')
      .insert({
        user_id: creation.user_id,
        type: creation.type,
        title: creation.title,
        content: creation.content,
        images: creation.images,
        created_at: Date.now(),
        deleted_at: creation.deleted_at ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as Creation;
  }

  async getById(id: string): Promise<Creation | null> {
    const { data, error } = await getClient()
      .from('creations')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();
    if (error) throw error;
    return data as Creation | null;
  }

  async getByUserId(
    userId: string,
    options?: QueryOptions
  ): Promise<Creation[]> {
    let query = getClient()
      .from('creations')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null);
    query = applyQueryOptions(query, options);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Creation[];
  }

  async getByType(
    userId: string,
    type: Creation['type'],
    options?: QueryOptions
  ): Promise<Creation[]> {
    let query = getClient()
      .from('creations')
      .select('*')
      .eq('user_id', userId)
      .eq('type', type)
      .is('deleted_at', null);
    query = applyQueryOptions(query, options);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Creation[];
  }

  async delete(id: string): Promise<void> {
    const { error } = await getClient()
      .from('creations')
      .update({ deleted_at: Date.now() })
      .eq('id', id);
    if (error) throw error;
  }
}

// ─── Data Export Service ────────────────────────────────
class SupabaseDataExportService implements IDataExportService {
  async exportAll(): Promise<DataExport> {
    const client = getClient();
    const [users, characters, messages, memories, relationships, creations] =
      await Promise.all([
        client.from('users').select('*').then((r: { data: User[] | null }) => r.data ?? []),
        client.from('characters').select('*').then((r: { data: Character[] | null }) => r.data ?? []),
        client.from('messages').select('*').then((r: { data: Message[] | null }) => r.data ?? []),
        client.from('memories').select('*').then((r: { data: Memory[] | null }) => r.data ?? []),
        client.from('relationships').select('*').then((r: { data: Relationship[] | null }) => r.data ?? []),
        client.from('creations').select('*').then((r: { data: Creation[] | null }) => r.data ?? []),
      ]);

    return {
      version: '1.0',
      exported_at: Date.now(),
      users: users as User[],
      characters: characters as Character[],
      messages: messages as Message[],
      memories: memories as Memory[],
      relationships: relationships as Relationship[],
      creations: creations as Creation[],
    };
  }

  async importAll(data: DataExport): Promise<void> {
    const client = getClient();

    // Delete existing data (RLS scoped to current user)
    await Promise.all([
      client.from('messages').delete().neq('id', ''),
      client.from('memories').delete().neq('id', ''),
      client.from('relationships').delete().neq('id', ''),
      client.from('creations').delete().neq('id', ''),
    ]);
    await client.from('characters').delete().neq('id', '');

    // Import in order respecting foreign keys
    if (data.users.length) {
      const { error } = await client.from('users').upsert(data.users);
      if (error) throw error;
    }
    if (data.characters.length) {
      const { error } = await client.from('characters').insert(data.characters);
      if (error) throw error;
    }
    await Promise.all([
      data.messages.length
        ? client.from('messages').insert(data.messages)
        : Promise.resolve(),
      data.memories.length
        ? client.from('memories').insert(data.memories)
        : Promise.resolve(),
      data.relationships.length
        ? client.from('relationships').insert(data.relationships)
        : Promise.resolve(),
      data.creations.length
        ? client.from('creations').insert(data.creations)
        : Promise.resolve(),
    ]);
  }
}

// ─── Tool Usage Service ─────────────────────────────────
class SupabaseToolUsageService implements IToolUsageService {
  async record(userId: string, toolType: string): Promise<void> {
    const { error } = await getClient()
      .from('tool_usage')
      .insert({
        user_id: userId,
        tool_type: toolType,
        created_at: Date.now(),
      });
    if (error) throw error;
  }

  async getGlobalRanking(
    days?: number
  ): Promise<{ tool_type: string; usage_count: number }[]> {
    const { data, error } = await getClient().rpc('get_global_tool_ranking', {
      p_days: days ?? null,
    });
    if (error) throw error;
    return (data ?? []) as { tool_type: string; usage_count: number }[];
  }

  async getPersonalRanking(
    userId: string,
    days?: number
  ): Promise<{ tool_type: string; usage_count: number }[]> {
    const { data, error } = await getClient().rpc(
      'get_personal_tool_ranking',
      {
        p_user_id: userId,
        p_days: days ?? null,
      }
    );
    if (error) throw error;
    return (data ?? []) as { tool_type: string; usage_count: number }[];
  }
}

// ─── Export Provider ────────────────────────────────────
export const supabaseProvider: IDataAccessLayer = {
  users: new SupabaseUserService(),
  characters: new SupabaseCharacterService(),
  messages: new SupabaseMessageService(),
  memories: new SupabaseMemoryService(),
  relationships: new SupabaseRelationshipService(),
  creations: new SupabaseCreativeService(),
  dataExport: new SupabaseDataExportService(),
  toolUsage: new SupabaseToolUsageService(),
};
