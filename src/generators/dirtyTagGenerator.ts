import type { ParsedConfig, DirtyTagDefinition } from '../types';
import { getDefaultHandlingSuggestion } from '../parsers/configParser';

/**
 * 生成脏数据说明表格
 */
export function generateDirtyTagTables(
  config: ParsedConfig
): { bag: string; frame: string } {
  // 分离包级别和帧级别脏签
  const bagTags: DirtyTagDefinition[] = [];
  const frameTags: DirtyTagDefinition[] = [];

  // 从 bagTags 提取
  Object.entries(config.bagTags).forEach(([, tagDef]) => {
    if (typeof tagDef.options === 'object' && tagDef.options !== null) {
      Object.entries(tagDef.options).forEach(([value, label]) => {
        bagTags.push({
          value,
          label: label as string,
          level: 'bag',
          description: tagDef.title,
          handlingSuggestion: getDefaultHandlingSuggestion(value, 'bag'),
        });
      });
    }
  });

  // 从 frameIssueTags 提取
  Object.entries(config.frameIssueTags).forEach(([, tagDef]) => {
    if (typeof tagDef.options === 'object' && tagDef.options !== null) {
      Object.entries(tagDef.options).forEach(([value, label]) => {
        frameTags.push({
          value,
          label: label as string,
          level: 'frame',
          description: tagDef.title,
          handlingSuggestion: getDefaultHandlingSuggestion(value, 'frame'),
        });
      });
    }
  });

  return {
    bag: generateTableMarkdown(bagTags, 'bag'),
    frame: generateTableMarkdown(frameTags, 'frame'),
  };
}

/**
 * 生成单个脏签表格的 Markdown
 */
function generateTableMarkdown(
  tags: DirtyTagDefinition[],
  level: 'bag' | 'frame'
): string {
  if (tags.length === 0) {
    return level === 'bag'
      ? '无包级别脏签定义'
      : '无帧级别脏签定义';
  }

  const lines: string[] = [];

  // 表头
  lines.push('| 值 | 含义 | 处理建议 |');
  lines.push('|-----|-----|-----|');

  // 数据行
  tags.forEach((tag) => {
    const value = `\`${tag.value}\``;
    const meaning = tag.label + (tag.description ? `<br><small>${tag.description}</small>` : '');
    const handling = tag.handlingSuggestion || '根据具体情况判断';
    lines.push(`| ${value} | ${meaning} | ${handling} |`);
  });

  return lines.join('\n');
}

/**
 * 生成脏签统计信息
 */
export function generateDirtyTagStats(
  config: ParsedConfig
): string {
  const lines: string[] = [];

  // 统计数量
  let bagCount = 0;
  let frameCount = 0;

  Object.values(config.bagTags).forEach((tagDef) => {
    if (typeof tagDef.options === 'object' && tagDef.options !== null) {
      bagCount += Object.keys(tagDef.options).length;
    }
  });

  Object.values(config.frameIssueTags).forEach((tagDef) => {
    if (typeof tagDef.options === 'object' && tagDef.options !== null) {
      frameCount += Object.keys(tagDef.options).length;
    }
  });

  lines.push(`- **包级别脏签**: ${bagCount} 个`);
  lines.push(`- **帧级别脏签**: ${frameCount} 个`);
  lines.push(`- **总计**: ${bagCount + frameCount} 个`);

  return lines.join('\n');
}

/**
 * 生成脏签使用说明
 */
export function generateDirtyTagUsageGuide(): string {
  return `### 脏签处理原则

1. **包级别脏签**（currentBagTags）
   - 作用于整个数据包
   - 标记后通常需要跳过整个包的使用
   - 常见原因：数据不存在、质量不确定、路网错误等

2. **帧级别脏签**（currentFrameIssueTags）
   - 作用于单帧数据
   - 可根据具体标签决定是否使用该帧
   - 常见原因：距离分段、特殊情况标记等

3. **处理优先级**
   - 先检查包级别脏签，如有则跳过
   - 再检查帧级别脏签，根据业务需求过滤
   - 最后检查标注对象完整性`;
}

/**
 * 生成脏签快速参考
 */
export function generateDirtyTagQuickRef(
  config: ParsedConfig
): string {
  const lines: string[] = [];
  lines.push('### 快速参考');
  lines.push('');

  // 包脏签
  const bagTypes: string[] = [];
  Object.values(config.bagTags).forEach((tagDef) => {
    if (typeof tagDef.options === 'object' && tagDef.options !== null) {
      Object.keys(tagDef.options).forEach((key) => bagTypes.push(`\`${key}\``));
    }
  });

  if (bagTypes.length > 0) {
    lines.push(`**包脏签**: ${bagTypes.join(', ')}`);
    lines.push('');
  }

  // 帧脏签
  const frameTypes: string[] = [];
  Object.values(config.frameIssueTags).forEach((tagDef) => {
    if (typeof tagDef.options === 'object' && tagDef.options !== null) {
      Object.keys(tagDef.options).forEach((key) => frameTypes.push(`\`${key}\``));
    }
  });

  if (frameTypes.length > 0) {
    lines.push(`**帧脏签**: ${frameTypes.join(', ')}`);
    lines.push('');
  }

  return lines.join('\n');
}