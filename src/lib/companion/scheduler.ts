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

// 检查是否到达问候时间
export function checkScheduledGreeting(): ScheduledGreeting | null {
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const greeting = DEFAULT_GREETINGS.find(
    g => g.enabled && g.time === currentTime
  );

  return greeting || null;
}

// 获取下一个问候时间
export function getNextGreetingTime(): Date | null {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const enabledGreetings = DEFAULT_GREETINGS.filter(g => g.enabled);
  if (enabledGreetings.length === 0) return null;

  // 找到下一个问候时间
  for (const greeting of enabledGreetings) {
    const [hours, minutes] = greeting.time.split(':').map(Number);
    const greetingMinutes = hours * 60 + minutes;

    if (greetingMinutes > currentMinutes) {
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
