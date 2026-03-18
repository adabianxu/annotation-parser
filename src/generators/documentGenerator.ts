import type { ParsedConfig, ParsedSpec, ParsedExamples, FieldMatch } from '../types';
// Note: FieldMatch is used in generateDocument and generateAnnotationSection
import { generateMermaidDiagram } from './mermaidGenerator';
import {
  generateDirtyTagTables,
  generateDirtyTagStats,
  generateDirtyTagUsageGuide,
  generateDirtyTagQuickRef,
} from './dirtyTagGenerator';
import {
  generateClassFieldDescriptions,
  generateFieldMatchSummary,
  generateDataExample,
} from './fieldGenerator';

/**
 * 生成完整的数据解析说明文档
 */
export function generateDocument(
  config: ParsedConfig,
  spec: ParsedSpec,
  examples: ParsedExamples,
  matches: FieldMatch[]
): string {
  const sections: string[] = [];

  // 1. 文档标题
  sections.push(generateTitle(config));

  // 2. 数据结构概览
  sections.push(generateStructureSection(config, examples));

  // 3. 脏数据说明
  sections.push(generateDirtyTagSection(config));

  // 4. 标注对象说明
  sections.push(generateAnnotationSection(config, spec, examples, matches));

  // 5. 数据使用建议
  sections.push(generateUsageSection(config, examples));

  // 6. 数据示例
  sections.push(generateExampleSection(config));

  return sections.join('\n');
}

/**
 * 生成文档标题
 */
function generateTitle(config: ParsedConfig): string {
  const projectName = config.projectName || '标注数据';
  return `# ${projectName} 数据解析说明

本文档自动生成，用于说明标注数据的结构、字段含义及使用方法。
`;
}

/**
 * 生成数据结构章节
 */
function generateStructureSection(
  config: ParsedConfig,
  examples: ParsedExamples
): string {
  const lines: string[] = [];

  lines.push('## 1. 数据结构概览');
  lines.push('');
  lines.push('### 1.1 数据层级结构');
  lines.push('');
  lines.push('```mermaid');
  lines.push(generateMermaidDiagram(config, examples));
  lines.push('```');
  lines.push('');

  // 添加结构说明
  lines.push('### 1.2 结构说明');
  lines.push('');
  lines.push('- **frames**: 帧数组，包含连续的标注帧');
  lines.push('- **状态标记**: 标识帧的处理状态');
  lines.push('- **脏签数据**: 数据质量标记，用于筛选');
  lines.push('- **objects**: 标注对象，包含具体的标注信息');
  lines.push('');

  // 统计数据
  lines.push('### 1.3 数据统计');
  lines.push('');
  lines.push(`- **标注类型**: ${config.classes.length} 种`);
  lines.push(`- **示例数据**: ${examples.sampleCount} 个文件`);

  const classNames = Array.from(examples.classes);
  if (classNames.length > 0) {
    lines.push(`- **发现的标注类**: ${classNames.join(', ')}`);
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * 生成脏数据说明章节
 */
function generateDirtyTagSection(config: ParsedConfig): string {
  const lines: string[] = [];

  lines.push('## 2. 脏数据说明');
  lines.push('');

  // 统计信息
  lines.push(generateDirtyTagStats(config));
  lines.push('');

  // 快速参考
  lines.push(generateDirtyTagQuickRef(config));
  lines.push('');

  // 包级别脏签
  const tables = generateDirtyTagTables(config);

  lines.push('### 2.1 包级别脏签');
  lines.push('');
  lines.push(tables.bag);
  lines.push('');

  // 帧级别脏签
  lines.push('### 2.2 帧级别脏签');
  lines.push('');
  lines.push(tables.frame);
  lines.push('');

  // 处理原则
  lines.push(generateDirtyTagUsageGuide());
  lines.push('');

  return lines.join('\n');
}

/**
 * 生成标注对象说明章节
 */
function generateAnnotationSection(
  config: ParsedConfig,
  spec: ParsedSpec,
  examples: ParsedExamples,
  matches: FieldMatch[]
): string {
  const lines: string[] = [];

  lines.push('## 3. 标注对象说明');
  lines.push('');

  // 字段匹配情况
  if (matches.length > 0) {
    lines.push(generateFieldMatchSummary(matches));
    lines.push('');
  }

  // 各类标注说明
  lines.push(generateClassFieldDescriptions(config, spec, examples, matches));
  lines.push('');

  return lines.join('\n');
}

/**
 * 生成数据使用建议章节
 */
function generateUsageSection(
  _config: ParsedConfig,
  examples: ParsedExamples
): string {
  const lines: string[] = [];

  lines.push('## 4. 数据使用建议');
  lines.push('');

  lines.push('### 4.1 数据筛选流程');
  lines.push('');
  lines.push('```');
  lines.push('1. 读取数据文件');
  lines.push('2. 检查包级别脏签，如有则跳过');
  lines.push('3. 遍历 frames');
  lines.push('4. 检查帧级别脏签，按需过滤');
  lines.push('5. 提取 objects 中的标注对象');
  lines.push('6. 根据业务需求筛选特定标注类型');
  lines.push('7. 提取字段用于训练/评测');
  lines.push('```');
  lines.push('');

  lines.push('### 4.2 注意事项');
  lines.push('');
  lines.push('- 优先检查 `isSkip` 标记，跳过的帧通常不包含有效标注');
  lines.push('- 关注 `isHardcase` 标记，难例数据可能需要特殊处理');
  lines.push('- 包脏签优先级高于帧脏签，包级别问题会导致整包不可用');
  lines.push('- extraInfo 中的字段可能因业务需求变化，建议动态读取');
  lines.push('');

  // 如果有 extraInfo 字段，添加说明
  let hasExtraInfo = false;
  examples.extraInfoFields.forEach((fields) => {
    if (fields.size > 0) hasExtraInfo = true;
  });

  if (hasExtraInfo) {
    lines.push('### 4.3 extraInfo 业务字段说明');
    lines.push('');
    lines.push('extraInfo 中包含业务相关的扩展字段，这些字段在不同项目中可能不同。');
    lines.push('建议使用时先检查字段是否存在，避免硬编码。');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * 生成数据示例章节
 */
function generateExampleSection(config: ParsedConfig): string {
  const lines: string[] = [];

  lines.push('## 5. 数据示例');
  lines.push('');
  lines.push(generateDataExample(config));
  lines.push('');

  return lines.join('\n');
}

/**
 * 生成简化的文档（用于预览）
 */
export function generatePreviewDocument(
  config: ParsedConfig,
  _spec: ParsedSpec,
  examples: ParsedExamples
): string {
  const sections: string[] = [];

  sections.push(generateTitle(config));
  sections.push(generateStructureSection(config, examples));
  sections.push(generateDirtyTagSection(config));

  return sections.join('\n');
}
