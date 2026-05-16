// 日程问候调度器

export interface ScheduledGreeting {
  time: string; // HH:MM format
  message: string;
  enabled: boolean;
}

// 默认问候时间表
export const DEFAULT_GREETINGS: ScheduledGreeting[] = [
  { time: '08:00', message: '早上好！新的一天开始了~', enabled: true },
  { time: '12:00', message: '中午了，记得吃午饭哦！', enabled: true },
  { time: '18:00', message: '晚上好！今天过得怎么样？', enabled: true },
  { time: '22:00', message: '该休息了，晚安~', enabled: true },
];

// 当天已触发的问候时间（内存记录，每天0点重置）
const triggeredToday = new Set<string>();
let lastResetDate = '';

function resetIfNewDay(): void {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  if (today !== lastResetDate) {
    triggeredToday.clear();
    lastResetDate = today;
  }
}

// 检查是否到达问候时间（±5分钟窗口，当天去重）
export function checkScheduledGreeting(): ScheduledGreeting | null {
  resetIfNewDay();

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const greeting of DEFAULT_GREETINGS) {
    if (!greeting.enabled) continue;
    if (triggeredToday.has(greeting.time)) continue;

    const [hours, minutes] = greeting.time.split(':').map(Number);
    const greetingMinutes = hours * 60 + minutes;
    const diff = Math.abs(currentMinutes - greetingMinutes);

    if (diff <= 5) {
      triggeredToday.add(greeting.time);
      return greeting;
    }
  }

  return null;
}

// 获取下一个问候时间
export function getNextGreetingTime(): Date | null {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const enabledGreetings = DEFAULT_GREETINGS.filter(g => g.enabled);
  if (enabledGreetings.length === 0) return null;

  // 找到下一个未触发的问候时间
  for (const greeting of enabledGreetings) {
    const [hours, minutes] = greeting.time.split(':').map(Number);
    const greetingMinutes = hours * 60 + minutes;

    if (greetingMinutes > currentMinutes + 5) {
      const nextTime = new Date(now);
      nextTime.setHours(hours, minutes, 0, 0);
      return nextTime;
    }
  }

  // 如果今天没有了，返回明天第一个
  const firstGreeting = enabledGreetings[0];
  const [hours, minutes] = firstGreeting.time.split(':').map(Number);
  const nextTime = new Date(now);
  nextTime.setDate(nextTime.getDate() + 1);
  nextTime.setHours(hours, minutes, 0, 0);
  return nextTime;
}

// 启动问候调度器（浏览器环境）
export function startGreetingScheduler(
  onGreeting: (message: string) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const interval = setInterval(() => {
    const greeting = checkScheduledGreeting();
    if (greeting) {
      onGreeting(greeting.message);
    }
  }, 60 * 1000); // 每分钟检查一次

  return () => clearInterval(interval);
}
