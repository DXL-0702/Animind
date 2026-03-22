'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/stores/app-store';
import { logout } from '@/lib/auth/supabase-auth';
import { dal } from '@/lib/dal';

interface UserStats {
  userId: string;
  nickname: string;
  email: string;
  characterCount: number;
  messageCount: number;
  creationCount: number;
  lastActive: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { isAdmin, userId } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserStats[]>([]);
  const [toolUsage, setToolUsage] = useState<{ tool_type: string; usage_count: number }[]>([]);

  useEffect(() => {
    if (!userId) {
      router.push('/login');
      return;
    }

    if (!isAdmin) {
      router.push('/');
      return;
    }

    loadAdminData();
  }, [userId, isAdmin, router]);

  async function loadAdminData() {
    try {
      setLoading(true);

      // 获取全局工具使用统计
      const usage = await dal.toolUsage.getGlobalRanking();
      setToolUsage(usage);

      // TODO: 获取所有用户统计（需要添加 RPC 函数）
      // 暂时显示工具使用数据
    } catch (error) {
      console.error('加载管理员数据失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 头部 */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">管理员后台</h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/')}
              className="btn btn-ghost"
            >
              返回首页
            </button>
            <button
              onClick={handleLogout}
              className="btn btn-error"
            >
              退出登录
            </button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-primary">总用户数</h2>
              <p className="text-4xl font-bold">{users.length}</p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-secondary">工具使用次数</h2>
              <p className="text-4xl font-bold">
                {toolUsage.reduce((sum, item) => sum + item.usage_count, 0)}
              </p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-accent">活跃用户</h2>
              <p className="text-4xl font-bold">
                {users.filter(u => Date.now() - u.lastActive < 7 * 24 * 60 * 60 * 1000).length}
              </p>
            </div>
          </div>
        </div>

        {/* 工具使用排行 */}
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title mb-4">工具使用排行</h2>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>工具名称</th>
                    <th>使用次数</th>
                    <th>占比</th>
                  </tr>
                </thead>
                <tbody>
                  {toolUsage.map((item) => {
                    const total = toolUsage.reduce((sum, i) => sum + i.usage_count, 0);
                    const percentage = total > 0 ? ((item.usage_count / total) * 100).toFixed(1) : '0';

                    const toolNames: Record<string, string> = {
                      oc_generator: 'OC角色生成器',
                      tone_writer: '语气仿写',
                      comic_generator: '4格漫画',
                      art_prompt: '画风提示词',
                      title_optimizer: '标题优化',
                      companion: '仿生人陪伴',
                    };

                    return (
                      <tr key={item.tool_type}>
                        <td>{toolNames[item.tool_type] || item.tool_type}</td>
                        <td>{item.usage_count}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <progress
                              className="progress progress-primary w-32"
                              value={item.usage_count}
                              max={total}
                            ></progress>
                            <span>{percentage}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 用户列表 */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">用户列表</h2>
            {users.length === 0 ? (
              <p className="text-center text-gray-500 py-8">暂无用户数据</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>用户ID</th>
                      <th>昵称</th>
                      <th>邮箱</th>
                      <th>角色数</th>
                      <th>消息数</th>
                      <th>创作数</th>
                      <th>最后活跃</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.userId}>
                        <td className="font-mono text-xs">{user.userId.slice(0, 8)}...</td>
                        <td>{user.nickname || '未设置'}</td>
                        <td>{user.email}</td>
                        <td>{user.characterCount}</td>
                        <td>{user.messageCount}</td>
                        <td>{user.creationCount}</td>
                        <td>{new Date(user.lastActive).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
