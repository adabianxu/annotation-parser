import type { ParsedConfig, ParsedExamples } from '../types';

/**
 * 生成 Mermaid 数据结构图
 * 展示标注相关的数据层级结构
 */
export function generateMermaidDiagram(
  config: ParsedConfig,
  examples: ParsedExamples
): string {
  const lines: string[] = [];

  lines.push('graph TD');
  lines.push('    %% 数据层级结构');
  lines.push('');

  // 根节点
  lines.push('    A[frames: 帧数组] --> B[状态标记]');
  lines.push('    A --> C[脏签数据]');
  lines.push('    A --> D[objects: 标注对象]');
  lines.push('');

  // 状态标记
  lines.push('    %% 状态标记');
  lines.push('    B --> B1[isSkip: 是否跳过]');
  lines.push('    B --> B2[isHardcase: 是否难例]');
  lines.push('');

  // 脏签数据
  lines.push('    %% 脏签数据');
  if (Object.keys(config.bagTags).length > 0) {
    lines.push('    C --> C1[currentBagTags: 包级别]');
    const bagTagType = config.bagTags.type;
    if (bagTagType && typeof bagTagType.options === 'object') {
      Object.keys(bagTagType.options).forEach((key, index) => {
        lines.push(`    C1 --> C1${index + 1}["${key}"]`);
      });
    }
  }

  if (Object.keys(config.frameIssueTags).length > 0) {
    lines.push('    C --> C2[currentFrameIssueTags: 帧级别]');
    const frameTagType = config.frameIssueTags.type;
    if (frameTagType && typeof frameTagType.options === 'object') {
      Object.keys(frameTagType.options).forEach((key, index) => {
        lines.push(`    C2 --> C2${index + 1}["${key}"]`);
      });
    }
  }
  lines.push('');

  // 标注对象
  lines.push('    %% 标注对象');
  const classes = config.classes;
  if (classes.length > 0) {
    classes.forEach((cls, classIndex) => {
      const nodeId = `D${classIndex + 1}`;
      const shapeLabel = cls.shape.join(', ');
      lines.push(`    D --> ${nodeId}["${cls.title} (${shapeLabel})"]`);

      // 添加字段
      const tags = Object.entries(cls.tags);
      if (tags.length > 0) {
        tags.forEach(([tagKey, tagDef], tagIndex) => {
          const fieldNodeId = `${nodeId}_${tagIndex + 1}`;
          const required = tagDef.required ? '*' : '';
          const multi = tagDef.multi ? '[]' : '';
          lines.push(`    ${nodeId} --> ${fieldNodeId}["${tagKey}${required}: ${tagDef.title}${multi}"]`);
        });
      }

      // 添加 extraInfo 业务字段
      const extraFields = examples.extraInfoFields.get(cls.classKey);
      if (extraFields && extraFields.size > 0) {
        const extraNodeId = `${nodeId}_extra`;
        lines.push(`    ${nodeId} --> ${extraNodeId}["extraInfo (业务字段)"]`);
        Array.from(extraFields).forEach((field, fieldIndex) => {
          if (fieldIndex < 5) { // 最多显示5个
            lines.push(`    ${extraNodeId} --> ${extraNodeId}_${fieldIndex + 1}["${field}"]`);
          }
        });
        if (extraFields.size > 5) {
          lines.push(`    ${extraNodeId} --> ${extraNodeId}_more["... 还有 ${extraFields.size - 5} 个字段"]`);
        }
      }

      lines.push('');
    });
  }

  // 样式定义
  lines.push('    %% 样式');
  lines.push('    classDef root fill:#f9fafb,stroke:#374151,stroke-width:2px');
  lines.push('    classDef status fill:#dbeafe,stroke:#2563eb,stroke-width:1px');
  lines.push('    classDef dirty fill:#fef3c7,stroke:#d97706,stroke-width:1px');
  lines.push('    classDef object fill:#d1fae5,stroke:#059669,stroke-width:1px');
  lines.push('    classDef field fill:#f3f4f6,stroke:#6b7280,stroke-width:1px');
  lines.push('');
  lines.push('    class A root');
  lines.push('    class B,B1,B2 status');
  lines.push('    class C,C1,C2,C11,C12,C13,C21,C22,C23 dirty');
  lines.push(`    class D,${classes.map((_, i) => `D${i + 1}`).join(',')} object`);

  return lines.join('\n');
}

/**
 * 生成简化版数据结构图（当数据较复杂时使用）
 */
export function generateSimpleDiagram(
  config: ParsedConfig,
  _examples: ParsedExamples
): string {
  const lines: string[] = [];

  lines.push('graph LR');
  lines.push('    A[帧数据] --> B[状态]');
  lines.push('    A --> C[脏签]');
  lines.push('    A --> D[标注对象]');
  lines.push('');
  lines.push('    B --> B1[isSkip]');
  lines.push('    B --> B2[isHardcase]');
  lines.push('');

  if (Object.keys(config.bagTags).length > 0) {
    lines.push('    C --> C1[包脏签]');
  }
  if (Object.keys(config.frameIssueTags).length > 0) {
    lines.push('    C --> C2[帧脏签]');
  }
  lines.push('');

  config.classes.forEach((cls, index) => {
    lines.push(`    D --> D${index + 1}[${cls.title}]`);
  });

  return lines.join('\n');
}

/**
 * 生成数据流向图
 */
export function generateDataFlowDiagram(): string {
  return `graph LR
    A[标注规范文档] --> D[文档生成器]
    B[配置文件] --> D
    C[示例数据] --> D
    D --> E[数据解析说明文档]

    style A fill:#dbeafe,stroke:#2563eb
    style B fill:#dbeafe,stroke:#2563eb
    style C fill:#dbeafe,stroke:#2563eb
    style D fill:#f3e8ff,stroke:#9333ea
    style E fill:#d1fae5,stroke:#059669`;
}
