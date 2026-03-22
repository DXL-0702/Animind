import type { IDataAccessLayer } from './interfaces';
import { dexieProvider } from './dexie-provider';
import { supabaseProvider } from './supabase-provider';

// Provider工厂 - 根据环境变量切换实现
function createDAL(): IDataAccessLayer {
  const provider = process.env.NEXT_PUBLIC_DAL_PROVIDER || 'dexie';

  switch (provider) {
    case 'supabase':
      return supabaseProvider;
    case 'dexie':
    default:
      return dexieProvider;
  }
}

export const dal = createDAL();

// 导出类型
export * from './types';
export * from './interfaces';
