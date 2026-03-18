// 解析器模块统一导出

export {
  parseConfig,
  getDefaultHandlingSuggestion,
  enrichDirtyTagsWithSuggestions,
} from './configParser';

export {
  parseSpecDocument,
  mergeDirtyTagInfo,
} from './specParser';

export {
  parseExampleFiles,
  getDirtyTagUsage,
  analyzeDataQuality,
} from './exampleParser';

export {
  matchFields,
  matchWithExampleFields,
  validateFieldMatches,
  getCommonFieldAliases,
  matchWithAliases,
} from './fieldMatcher';

// 导出类型
export type {
  ParsedConfig,
  ParsedSpec,
  ParsedExamples,
  FieldMatch,
  ClassDefinition,
  TagDefinition,
  DirtyTagDefinition,
  FieldDescription,
  DirtyTagDescription,
  DiscoveredField,
  DocumentData,
} from '../types';
