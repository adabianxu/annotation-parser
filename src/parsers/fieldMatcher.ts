import type { FieldMatch, ParsedConfig, ParsedSpec, ParsedExamples } from '../types';

/**
 * 计算 Levenshtein 距离（编辑距离）
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // 创建距离矩阵
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // 初始化边界
  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  // 填充矩阵
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,      // 删除
          dp[i][j - 1] + 1,      // 插入
          dp[i - 1][j - 1] + 1   // 替换
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * 计算字符串相似度（0-1）
 */
function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;

  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1;

  const distance = levenshteinDistance(s1, s2);
  return 1 - distance / maxLen;
}

/**
 * 标准化字段名（移除特殊字符，统一格式）
 */
function normalizeFieldName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * 字段匹配结果
 */
interface MatchCandidate {
  docField: string;
  similarity: number;
}

/**
 * 匹配配置文件字段与文档描述字段
 */
export function matchFields(
  config: ParsedConfig,
  spec: ParsedSpec
): FieldMatch[] {
  const matches: FieldMatch[] = [];

  // 收集所有配置中的字段
  const configFields = collectConfigFields(config);

  // 收集所有文档中的字段描述
  const docFields = spec.fieldDescriptions.map((f) => f.fieldName);

  // 为每个配置字段寻找最佳匹配
  configFields.forEach((configField) => {
    const bestMatch = findBestMatch(configField, docFields);

    let match: FieldMatch;
    if (bestMatch.similarity >= 0.8) {
      // 精确匹配
      match = {
        configField,
        docField: bestMatch.docField,
        matchType: 'exact',
        confidence: bestMatch.similarity,
        description: getFieldDescription(bestMatch.docField, spec),
      };
    } else if (bestMatch.similarity >= 0.5) {
      // 模糊匹配
      match = {
        configField,
        docField: bestMatch.docField,
        matchType: 'fuzzy',
        confidence: bestMatch.similarity,
        description: getFieldDescription(bestMatch.docField, spec),
      };
    } else {
      // 未匹配
      match = {
        configField,
        matchType: 'unmatched',
        confidence: 0,
      };
    }

    matches.push(match);
  });

  return matches;
}

/**
 * 收集配置文件中的所有字段
 */
function collectConfigFields(config: ParsedConfig): string[] {
  const fields: string[] = [];

  // 收集 classes 中的字段
  config.classes.forEach((cls) => {
    Object.keys(cls.tags).forEach((tagKey) => {
      if (!fields.includes(tagKey)) {
        fields.push(tagKey);
      }
    });
  });

  // 收集 bagTags 和 frameIssueTags
  Object.keys(config.bagTags).forEach((key) => {
    if (!fields.includes(key)) {
      fields.push(key);
    }
  });

  Object.keys(config.frameIssueTags).forEach((key) => {
    if (!fields.includes(key)) {
      fields.push(key);
    }
  });

  return fields;
}

/**
 * 寻找最佳匹配的文档字段
 */
function findBestMatch(configField: string, docFields: string[]): MatchCandidate {
  let bestMatch: MatchCandidate = { docField: '', similarity: 0 };

  const normalizedConfig = normalizeFieldName(configField);

  docFields.forEach((docField) => {
    const normalizedDoc = normalizeFieldName(docField);

    // 尝试多种匹配方式
    const similarities = [
      stringSimilarity(configField, docField),
      stringSimilarity(normalizedConfig, normalizedDoc),
      stringSimilarity(configField.toLowerCase(), docField.toLowerCase()),
    ];

    const maxSimilarity = Math.max(...similarities);

    if (maxSimilarity > bestMatch.similarity) {
      bestMatch = { docField, similarity: maxSimilarity };
    }
  });

  return bestMatch;
}

/**
 * 获取字段的描述
 */
function getFieldDescription(fieldName: string, spec: ParsedSpec): string {
  const desc = spec.fieldDescriptions.find(
    (f) => f.fieldName.toLowerCase() === fieldName.toLowerCase()
  );
  return desc?.description || '';
}

/**
 * 基于示例数据字段进行补充匹配
 */
export function matchWithExampleFields(
  config: ParsedConfig,
  examples: ParsedExamples
): Map<string, string[]> {
  const result = new Map<string, string[]>();

  // 分析示例数据中的字段与配置字段的关系
  config.classes.forEach((cls) => {
    const classKey = cls.classKey;
    const matchedFields: string[] = [];

    // 获取该 class 对应的示例字段
    const exampleFields = examples.extraInfoFields.get(classKey) || new Set();

    // 匹配 tag 定义与示例字段
    Object.keys(cls.tags).forEach((tagKey) => {
      if (exampleFields.has(tagKey)) {
        matchedFields.push(tagKey);
      }
    });

    if (matchedFields.length > 0) {
      result.set(classKey, matchedFields);
    }
  });

  return result;
}

/**
 * 验证字段匹配的完整性
 */
export function validateFieldMatches(matches: FieldMatch[]): {
  total: number;
  exact: number;
  fuzzy: number;
  unmatched: number;
  suggestions: string[];
} {
  const total = matches.length;
  const exact = matches.filter((m) => m.matchType === 'exact').length;
  const fuzzy = matches.filter((m) => m.matchType === 'fuzzy').length;
  const unmatched = matches.filter((m) => m.matchType === 'unmatched').length;

  const suggestions: string[] = [];

  if (unmatched > 0) {
    const unmatchedFields = matches
      .filter((m) => m.matchType === 'unmatched')
      .map((m) => m.configField);
    suggestions.push(
      `有 ${unmatched} 个字段未匹配到文档描述，建议手动补充: ${unmatchedFields.join(', ')}`
    );
  }

  if (fuzzy > total * 0.3) {
    suggestions.push('模糊匹配字段较多，建议检查匹配准确性');
  }

  return { total, exact, fuzzy, unmatched, suggestions };
}

/**
 * 智能推荐字段别名映射
 * 用于处理常见命名差异
 */
export function getCommonFieldAliases(): Map<string, string[]> {
  const aliases = new Map<string, string[]>();

  aliases.set('id', ['iD', 'ID', 'id', '标识', '编号']);
  aliases.set('type', ['type', '类型', '类别', '种类']);
  aliases.set('observationType', ['observationType', '观测类型', '观察类型', '观测方式']);
  aliases.set('sceneType', ['sceneType', '场景类型', '场景', '类型']);

  return aliases;
}

/**
 * 使用别名进行辅助匹配
 */
export function matchWithAliases(
  configField: string,
  docFields: string[],
  aliases: Map<string, string[]>
): string | null {
  // 查找该字段可能的别名
  let fieldAliases: string[] = [configField];

  aliases.forEach((aliasList) => {
    if (aliasList.includes(configField)) {
      fieldAliases = [...fieldAliases, ...aliasList];
    }
  });

  // 尝试用别名匹配
  for (const alias of fieldAliases) {
    const normalizedAlias = normalizeFieldName(alias);
    const match = docFields.find(
      (f) => normalizeFieldName(f) === normalizedAlias
    );
    if (match) return match;
  }

  return null;
}
