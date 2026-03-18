import type {
  ParsedConfig,
  ClassDefinition,
  TagDefinition,
  DirtyTagDefinition,
} from '../types';

/**
 * 解析标注配置文件
 * @param configJson 配置文件内容
 * @returns 解析后的配置对象
 */
export function parseConfig(configJson: string): ParsedConfig {
  const config = JSON.parse(configJson);

  const result: ParsedConfig = {
    classes: [],
    bagTags: {},
    frameIssueTags: {},
    dirtyTags: [],
  };

  // 尝试从 workflow_info 或 rules 中提取项目名称
  if (config.workflow_info?.name) {
    result.projectName = config.workflow_info.name;
  }

  // 解析 rules 部分
  // 处理 rules 是对象（键是文件路径）或直接是规则对象的情况
  let rules = config.rules || config;

  // 如果 rules 是一个对象且值不是数组（即键是文件路径），取第一个 rule
  if (rules && typeof rules === 'object' && !Array.isArray(rules)) {
    const keys = Object.keys(rules);
    if (keys.length > 0 && typeof rules[keys[0]] === 'object') {
      // 检查是否是文件路径键（包含 .json 或 /）
      if (keys[0].includes('.json') || keys[0].includes('/')) {
        rules = rules[keys[0]];
      }
    }
  }

  // 解析 classes
  if (rules.classes) {
    result.classes = rules.classes.map(parseClassDefinition);
  }

  // 解析 bagTags（包脏签）
  if (rules.bagTags) {
    result.bagTags = parseTags(rules.bagTags);
    // 同时生成脏签列表
    Object.entries(result.bagTags).forEach(([, tagDef]) => {
      if (typeof tagDef.options === 'object' && tagDef.options !== null) {
        Object.entries(tagDef.options).forEach(([value, label]) => {
          result.dirtyTags.push({
            value,
            label: label as string,
            level: 'bag',
            description: tagDef.title,
          });
        });
      }
    });
  }

  // 解析 frameIssueTags（帧脏签）
  if (rules.frameIssueTags) {
    result.frameIssueTags = parseTags(rules.frameIssueTags);
    // 同时生成脏签列表
    Object.entries(result.frameIssueTags).forEach(([, tagDef]) => {
      if (typeof tagDef.options === 'object' && tagDef.options !== null) {
        Object.entries(tagDef.options).forEach(([value, label]) => {
          result.dirtyTags.push({
            value,
            label: label as string,
            level: 'frame',
            description: tagDef.title,
          });
        });
      }
    });
  }

  return result;
}

/**
 * 解析单个 class 定义
 */
function parseClassDefinition(classData: any): ClassDefinition {
  return {
    classKey: classData.classKey || classData.key || '',
    title: classData.title || '',
    color: classData.color || '#000000',
    shape: classData.shape || [],
    tags: parseTags(classData.tags || {}),
  };
}

/**
 * 解析 tags 定义
 */
function parseTags(tagsData: Record<string, any>): Record<string, TagDefinition> {
  const result: Record<string, TagDefinition> = {};

  Object.entries(tagsData).forEach(([key, tagData]) => {
    if (typeof tagData === 'object' && tagData !== null) {
      result[key] = {
        title: tagData.title || key,
        multi: tagData.multi || false,
        required: tagData.required || false,
        options: parseTagOptions(tagData.options),
      };
    }
  });

  return result;
}

/**
 * 解析标签选项
 * 可能是对象、字符串（input）或其他类型
 */
function parseTagOptions(options: any): Record<string, string> | string {
  if (options === 'input') {
    return 'input';
  }

  if (typeof options === 'object' && options !== null && !Array.isArray(options)) {
    return options as Record<string, string>;
  }

  if (typeof options === 'string') {
    return options;
  }

  // 默认返回空对象
  return {};
}

/**
 * 获取脏签的处理建议
 * 基于常见模式返回默认建议
 */
export function getDefaultHandlingSuggestion(
  tagValue: string,
  level: 'bag' | 'frame'
): string {
  // 包级别脏签的常见处理建议
  const bagSuggestions: Record<string, string> = {
    nonexistent: '跳过该包，数据不存在目标场景',
    indeterminacy: '跳过该包，数据质量不确定',
    parkingData: '跳过该包，园区数据不用于训练',
    notUnique: '跳过该包，路网ID不唯一，数据存在歧义',
    roadNetworkErrors: '跳过该包，路网生成存在错误',
    singleFrameRoadNetworkIDInterrupt: '跳过该包，单帧路网ID异常中断',
    multipleDeadEndRoad: '跳过该包，存在多个断头路，不符合评测要求',
  };

  // 帧级别脏签的常见处理建议
  const frameSuggestions: Record<string, string> = {
    shortDistance: '可作为训练样本，短距离场景',
    mediumDistance: '可作为训练样本，中等距离场景',
    longDistance: '可作为训练样本，远距离场景',
  };

  if (level === 'bag') {
    return bagSuggestions[tagValue] || '根据具体情况判断是否使用该数据';
  } else {
    return frameSuggestions[tagValue] || '可作为训练样本';
  }
}

/**
 * 补全脏签的处理建议
 */
export function enrichDirtyTagsWithSuggestions(
  dirtyTags: DirtyTagDefinition[]
): DirtyTagDefinition[] {
  return dirtyTags.map((tag) => ({
    ...tag,
    handlingSuggestion:
      tag.handlingSuggestion || getDefaultHandlingSuggestion(tag.value, tag.level),
  }));
}
