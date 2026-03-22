import { dal } from './index';
import type { DataExport } from './types';

// 导出数据包到JSON文件
export async function exportDataToJSON(): Promise<string> {
  const data = await dal.dataExport.exportAll();
  return JSON.stringify(data, null, 2);
}

/**
 * Replace all user_id references in a DataExport (e.g. 'default-user' → new Supabase UUID).
 * Used when migrating from Dexie local → Supabase cloud.
 */
export function migrateUserIds(data: DataExport, newUserId: string): DataExport {
  const OLD_ID = 'default-user';
  const replaceId = (uid: string) => (uid === OLD_ID ? newUserId : uid);

  return {
    ...data,
    users: data.users.map((u) => ({ ...u, id: replaceId(u.id) })),
    characters: data.characters.map((c) => ({ ...c, user_id: replaceId(c.user_id) })),
    messages: data.messages.map((m) => ({ ...m, user_id: replaceId(m.user_id) })),
    memories: data.memories.map((m) => ({ ...m, user_id: replaceId(m.user_id) })),
    relationships: data.relationships.map((r) => ({ ...r, user_id: replaceId(r.user_id) })),
    creations: data.creations.map((c) => ({ ...c, user_id: replaceId(c.user_id) })),
  };
}

// 从JSON导入数据包（可选自动迁移 user_id）
export async function importDataFromJSON(jsonString: string, newUserId?: string): Promise<void> {
  let data: DataExport = JSON.parse(jsonString);

  // 验证数据格式
  if (!data.version || !data.exported_at) {
    throw new Error('Invalid data format');
  }

  // Auto-migrate user IDs if a new userId is provided
  if (newUserId) {
    data = migrateUserIds(data, newUserId);
  }

  await dal.dataExport.importAll(data);
}

// 下载数据包到本地文件
export function downloadDataExport(jsonString: string, filename: string = 'animind-backup.json'): void {
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 从本地文件读取数据包
export function uploadDataExport(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        resolve(content);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    };
    input.click();
  });
}
