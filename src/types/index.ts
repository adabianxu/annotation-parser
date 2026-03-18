// 标注数据相关类型定义

// 配置文件中的标签选项
export interface TagOption {
  value: string;
  label: string;
}

// 配置文件中的标签定义
export interface TagDefinition {
  title: string;
  multi: boolean;
  required?: boolean;
  options: Record<string, string> | string; // 如果是input类型，值为'input'
}

// 配置文件中的 class 定义
export interface ClassDefinition {
  classKey: string;
  title: string;
  color: string;
  shape: string[];
  tags: Record<string, TagDefinition>;
}

// 脏签定义
export interface DirtyTagDefinition {
  value: string;
  label: string;
  level: 'bag' | 'frame';
  description?: string;
  handlingSuggestion?: string;
}

// 解析后的配置文件
export interface ParsedConfig {
  projectName?: string;
  classes: ClassDefinition[];
  bagTags: Record<string, TagDefinition>;
  frameIssueTags: Record<string, TagDefinition>;
  dirtyTags: DirtyTagDefinition[];
}

// Markdown 中提取的字段描述
export interface FieldDescription {
  fieldName: string;
  description: string;
  values?: string[];
  tableContext?: string; // 该字段来自哪个表格
}

// Markdown 中提取的脏数据说明
export interface DirtyTagDescription {
  tagValue: string;
  meaning: string;
  handlingSuggestion: string;
  level?: 'bag' | 'frame';
}

// 解析后的 Markdown 文档
export interface ParsedSpec {
  title?: string;
  fieldDescriptions: FieldDescription[];
  dirtyTagDescriptions: DirtyTagDescription[];
  rawContent: string;
}

// 示例数据中发现的字段
export interface DiscoveredField {
  fieldPath: string;
  fieldName: string;
  sampleValues: Set<string>;
  valueTypes: Set<string>;
  parentType?: string;
}

// 解析后的示例数据
export interface ParsedExamples {
  fields: DiscoveredField[];
  classes: Set<string>;
  annotationTypes: Set<string>;
  extraInfoFields: Map<string, Set<string>>; // classKey -> fields
  sampleCount: number;
}

// 字段匹配结果
export interface FieldMatch {
  configField: string;
  docField?: string;
  matchType: 'exact' | 'fuzzy' | 'unmatched';
  confidence: number;
  description?: string;
}

// 最终的文档生成数据
export interface DocumentData {
  projectName?: string;
  structure: {
    mermaidDiagram: string;
  };
  dirtyTags: {
    bag: DirtyTagDefinition[];
    frame: DirtyTagDefinition[];
  };
  classes: Array<{
    classKey: string;
    title: string;
    shape: string[];
    fields: Array<{
      name: string;
      description: string;
      type: string;
      options?: string[];
      required?: boolean;
    }>;
  }>;
  extraInfoFields: Map<string, string[]>;
}
