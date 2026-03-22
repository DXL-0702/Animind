/**
 * 从 LLM 返回的文本中提取 JSON。
 * 处理常见情况：markdown 代码围栏、前后多余文本。
 */
export function extractJSON<T = unknown>(raw: string): T {
  if (process.env.NODE_ENV === 'development') {
    console.debug('[extractJSON] raw input (first 200 chars):', raw.slice(0, 200));
  }

  // 1. 尝试直接解析（最快路径）
  try {
    return JSON.parse(raw);
  } catch { /* continue */ }

  // 2. 提取 ```json ... ``` 或 ``` ... ``` 围栏内容
  const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch { /* continue to step 3 */ }
  }

  // 3. 提取第一个 { ... } 或 [ ... ] 块
  const braceMatch = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (braceMatch) {
    try {
      return JSON.parse(braceMatch[1]);
    } catch { /* continue to error */ }
  }

  // 4. 全部失败
  throw new SyntaxError(
    `Failed to extract JSON from LLM response: ${raw.slice(0, 200)}`
  );
}
