// API成本追踪

interface CostRecord {
  timestamp: number;
  provider: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost: number; // 人民币
}

class CostTracker {
  private records: CostRecord[] = [];
  private readonly STORAGE_KEY = 'animind_cost_records';

  // 价格表（人民币/1M tokens）
  private readonly PRICING = {
    'glm-4-flash': { prompt: 0, completion: 0 }, // 完全免费
    'deepseek-chat': { prompt: 1, completion: 2 }, // ¥1/M prompt, ¥2/M completion
    'embedding-2': { prompt: 0, completion: 0 }, // 免费
  };

  constructor() {
    this.loadRecords();
  }

  // 记录API调用
  track(record: Omit<CostRecord, 'timestamp' | 'estimated_cost'>) {
    const pricing = this.PRICING[record.model as keyof typeof this.PRICING] || { prompt: 0, completion: 0 };
    const estimated_cost =
      (record.prompt_tokens / 1_000_000) * pricing.prompt +
      (record.completion_tokens / 1_000_000) * pricing.completion;

    const fullRecord: CostRecord = {
      ...record,
      timestamp: Date.now(),
      estimated_cost,
    };

    this.records.push(fullRecord);
    this.saveRecords();
  }

  // 获取今日成本
  getTodayCost(): number {
    const today = new Date().setHours(0, 0, 0, 0);
    return this.records
      .filter(r => r.timestamp >= today)
      .reduce((sum, r) => sum + r.estimated_cost, 0);
  }

  // 获取本月成本
  getMonthCost(): number {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    return this.records
      .filter(r => r.timestamp >= thisMonth.getTime())
      .reduce((sum, r) => sum + r.estimated_cost, 0);
  }

  // 获取总成本
  getTotalCost(): number {
    return this.records.reduce((sum, r) => sum + r.estimated_cost, 0);
  }

  // 获取统计信息
  getStats() {
    return {
      today: this.getTodayCost(),
      month: this.getMonthCost(),
      total: this.getTotalCost(),
      totalCalls: this.records.length,
      totalTokens: this.records.reduce((sum, r) => sum + r.total_tokens, 0),
    };
  }

  // 清除历史记录
  clear() {
    this.records = [];
    this.saveRecords();
  }

  private loadRecords() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.records = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load cost records:', error);
    }
  }

  private saveRecords() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.records));
    } catch (error) {
      console.error('Failed to save cost records:', error);
    }
  }
}

export const costTracker = new CostTracker();
