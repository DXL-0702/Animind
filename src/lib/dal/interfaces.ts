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

// 通用查询选项
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

// 用户服务接口
export interface IUserService {
  create(user: Omit<User, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<User>;
  getById(id: string): Promise<User | null>;
  update(id: string, data: Partial<User>): Promise<void>;
  delete(id: string): Promise<void>; // 软删除
}

// 角色服务接口
export interface ICharacterService {
  create(character: Omit<Character, 'id' | 'created_at' | 'updated_at'>): Promise<Character>;
  getById(id: string): Promise<Character | null>;
  getByUserId(userId: string, options?: QueryOptions): Promise<Character[]>;
  update(id: string, data: Partial<Character>): Promise<void>;
  delete(id: string): Promise<void>;
}

// 消息服务接口
export interface IMessageService {
  create(message: Omit<Message, 'id' | 'created_at'>): Promise<Message>;
  getById(id: string): Promise<Message | null>;
  getByCharacterId(characterId: string, options?: QueryOptions): Promise<Message[]>;
  delete(id: string): Promise<void>;
  deleteByCharacterId(characterId: string): Promise<void>;
}

// 记忆服务接口
export interface IMemoryService {
  create(memory: Omit<Memory, 'id' | 'created_at'>): Promise<Memory>;
  getById(id: string): Promise<Memory | null>;
  getByCharacterId(characterId: string, options?: QueryOptions): Promise<Memory[]>;
  search(characterId: string, queryEmbedding: number[], topK?: number): Promise<Memory[]>;
  updateAccessCount(id: string): Promise<void>;
  update(id: string, data: Partial<Memory>): Promise<void>;
  delete(id: string): Promise<void>;
}

// 关系服务接口
export interface IRelationshipService {
  create(relationship: Omit<Relationship, 'id' | 'created_at' | 'updated_at'>): Promise<Relationship>;
  getById(id: string): Promise<Relationship | null>;
  getByCharacterAndUser(characterId: string, userId: string): Promise<Relationship | null>;
  update(id: string, data: Partial<Relationship>): Promise<void>;
  delete(id: string): Promise<void>;
}

// 创作服务接口
export interface ICreativeService {
  create(creation: Omit<Creation, 'id' | 'created_at'>): Promise<Creation>;
  getById(id: string): Promise<Creation | null>;
  getByUserId(userId: string, options?: QueryOptions): Promise<Creation[]>;
  getByType(userId: string, type: Creation['type'], options?: QueryOptions): Promise<Creation[]>;
  delete(id: string): Promise<void>;
}

// 数据导出/导入接口
export interface IDataExportService {
  exportAll(): Promise<DataExport>;
  importAll(data: DataExport): Promise<void>;
}

// 工具使用统计接口
export interface IToolUsageService {
  record(userId: string, toolType: ToolUsage['tool_type']): Promise<void>;
  getGlobalRanking(days?: number): Promise<{ tool_type: string; usage_count: number }[]>;
  getPersonalRanking(userId: string, days?: number): Promise<{ tool_type: string; usage_count: number }[]>;
}

// 完整数据访问层接口
export interface IDataAccessLayer {
  users: IUserService;
  characters: ICharacterService;
  messages: IMessageService;
  memories: IMemoryService;
  relationships: IRelationshipService;
  creations: ICreativeService;
  dataExport: IDataExportService;
  toolUsage: IToolUsageService;
}
