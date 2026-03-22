// 数据模型定义 - 关系型结构，SQL-ready

export interface User {
  id: string;              // UUID主键
  nickname: string;
  created_at: number;      // Unix timestamp
  updated_at: number;
  deleted_at: number | null; // 软删除
}

export interface Character {
  id: string;              // UUID主键
  user_id: string;         // 外键→User
  name: string;
  personality: string;     // JSON: 性格特征
  appearance: string;      // JSON: 外貌描述
  backstory: string;
  image_url: string | null;
  voice_id: string;        // Edge TTS音色ID
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

export interface Message {
  id: string;              // UUID主键
  character_id: string;    // 外键→Character
  user_id: string;         // 外键→User
  role: 'user' | 'assistant';
  content: string;
  emotion: string | null;  // 当前情感状态
  created_at: number;
  deleted_at: number | null;
}

export interface Memory {
  id: string;              // UUID主键
  character_id: string;    // 外键→Character
  user_id: string;         // 外键→User
  content: string;         // 记忆内容
  facts: string[];         // 提取的事实列表
  importance: number;      // 0-1 重要度评分
  embedding: number[];     // 向量嵌入
  access_count: number;    // 访问次数
  last_accessed_at: number;
  created_at: number;
  deleted_at: number | null;
}

export interface Relationship {
  id: string;              // UUID主键
  character_id: string;    // 外键→Character
  user_id: string;         // 外键→User
  trust_level: number;     // 0-100 信任值
  trust_stage: 'stranger' | 'acquaintance' | 'friend' | 'close_friend' | 'master';
  emotion_state: string;   // 当前情感
  emotion_intensity: number; // 情感强度 0-1
  total_messages: number;
  last_interaction_at: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

export interface Creation {
  id: string;              // UUID主键
  user_id: string;         // 外键→User
  type: 'oc' | 'tone' | 'comic' | 'art_prompt' | 'title';
  title: string;
  content: string;         // JSON: 作品内容
  images: string[];        // 关联图片URL
  created_at: number;
  deleted_at: number | null;
}

export interface ToolUsage {
  id: string;
  user_id: string;
  tool_type: 'oc_generator' | 'tone_writer' | 'comic_generator' | 'art_prompt' | 'title_optimizer' | 'companion';
  created_at: number;
}

// 数据导出/导入格式
export interface DataExport {
  version: string;
  exported_at: number;
  users: User[];
  characters: Character[];
  messages: Message[];
  memories: Memory[];
  relationships: Relationship[];
  creations: Creation[];
}
