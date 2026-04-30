/**
 * JSON 解析和 repair
 * LLM 输出必须结构化，非法 JSON 能 repair once
 */

export interface ParseResult<T> {
  success: true;
  data: T;
}

export interface ParseError {
  success: false;
  error: string;
  rawOutput: string;
}

export type JsonResult<T> = ParseResult<T> | ParseError;

/**
 * 解析 JSON，支持 repair
 */
export function parseJsonOrRepair<T>(
  rawOutput: string,
  fallback: T,
  repairAttempts: number = 1
): JsonResult<T> {
  // 尝试直接解析
  try {
    const data = JSON.parse(rawOutput) as T;
    return { success: true, data };
  } catch {
    // 尝试修复
    return repairJson<T>(rawOutput, fallback, repairAttempts);
  }
}

/**
 * 修复 JSON
 */
function repairJson<T>(
  rawOutput: string,
  _fallback: T,
  attempts: number
): JsonResult<T> {
  for (let i = 0; i < attempts; i++) {
    const repaired = tryRepairJson(rawOutput);
    if (repaired) {
      try {
        const data = JSON.parse(repaired) as T;
        return { success: true, data };
      } catch {
        // 继续尝试
      }
    }
  }

  // 修复失败，返回 fallback
  return {
    success: false,
    error: 'Failed to parse JSON after repair attempts',
    rawOutput,
  };
}

/**
 * 尝试修复 JSON 字符串
 */
function tryRepairJson(raw: string): string | null {
  // 移除 markdown 代码块
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  // 尝试补全不完整的 JSON
  // 常见问题：缺少引号、缺少逗号、缺少括号
  try {
    // 如果是对象但缺少结尾括号
    if (cleaned.startsWith('{') && !cleaned.includes('}')) {
      const openBraces = (cleaned.match(/\{/g) || []).length;
      const closeBraces = (cleaned.match(/\}/g) || []).length;
      if (openBraces > closeBraces) {
        cleaned = cleaned + '}';
      }
    }

    // 如果是数组但缺少结尾括号
    if (cleaned.startsWith('[') && !cleaned.includes(']')) {
      const openBrackets = (cleaned.match(/\[/g) || []).length;
      const closeBrackets = (cleaned.match(/\]/g) || []).length;
      if (openBrackets > closeBrackets) {
        cleaned = cleaned + ']';
      }
    }

    // 验证修复后的 JSON
    JSON.parse(cleaned);
    return cleaned;
  } catch {
    return null;
  }
}

/**
 * 从 LLM 响应中提取 JSON 对象
 */
export function extractJsonFromResponse(content: string): string {
  // 尝试在 content 中找到 JSON 对象
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  const arrayMatch = content.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    return arrayMatch[0];
  }

  return content;
}
