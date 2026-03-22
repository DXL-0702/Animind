// 内容安全过滤器

// 敏感词库（示例，实际应更完善）
const SENSITIVE_WORDS = [
  // 政治敏感
  '习近平', '毛泽东', '共产党', '台独', '藏独', '疆独',
  // 色情暴力
  '色情', '暴力', '血腥', '恐怖', '自杀',
  // IP侵权（示例）
  '火影忍者', '海贼王', '名侦探柯南', '进击的巨人', '鬼灭之刃',
  '原神', '崩坏', '明日方舟', '碧蓝航线',
  '鸣人', '路飞', '柯南', '艾伦', '炭治郎',
];

// 检查文本是否包含敏感词
export function containsSensitiveWords(text: string): boolean {
  const lowerText = text.toLowerCase();
  return SENSITIVE_WORDS.some(word => lowerText.includes(word.toLowerCase()));
}

// 获取匹配的敏感词
export function findSensitiveWords(text: string): string[] {
  const lowerText = text.toLowerCase();
  return SENSITIVE_WORDS.filter(word => lowerText.includes(word.toLowerCase()));
}

// 替换敏感词为星号
export function maskSensitiveWords(text: string): string {
  let masked = text;
  SENSITIVE_WORDS.forEach(word => {
    const regex = new RegExp(word, 'gi');
    masked = masked.replace(regex, '*'.repeat(word.length));
  });
  return masked;
}

// LLM输出合规检查
export async function checkLLMOutputCompliance(output: string): Promise<{
  compliant: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  // 检查敏感词
  const sensitiveWords = findSensitiveWords(output);
  if (sensitiveWords.length > 0) {
    issues.push(`包含敏感词: ${sensitiveWords.join(', ')}`);
  }

  // 检查是否提到现有IP
  const ipKeywords = ['火影', '海贼', '柯南', '原神', '崩坏'];
  const mentionsIP = ipKeywords.some(keyword => output.includes(keyword));
  if (mentionsIP) {
    issues.push('可能涉及现有IP版权');
  }

  // 检查是否包含不当内容
  const inappropriatePatterns = [
    /色情|裸体|性行为/i,
    /暴力|血腥|杀人/i,
    /自杀|自残/i,
  ];

  inappropriatePatterns.forEach(pattern => {
    if (pattern.test(output)) {
      issues.push('包含不当内容');
    }
  });

  return {
    compliant: issues.length === 0,
    issues,
  };
}

// 用户输入预检查
export function validateUserInput(input: string): {
  valid: boolean;
  message?: string;
} {
  if (input.trim().length === 0) {
    return { valid: false, message: '输入不能为空' };
  }

  if (input.length > 2000) {
    return { valid: false, message: '输入过长（最多2000字）' };
  }

  const sensitiveWords = findSensitiveWords(input);
  if (sensitiveWords.length > 0) {
    return {
      valid: false,
      message: `输入包含敏感词: ${sensitiveWords.join(', ')}`,
    };
  }

  return { valid: true };
}
