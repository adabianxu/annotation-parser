import type { ParsedConfig, ParsedSpec, ParsedExamples, FieldMatch } from '../types';

/**
 * 生成标注对象字段说明
 */
export function generateClassFieldDescriptions(
  config: ParsedConfig,
  spec: ParsedSpec,
  examples: ParsedExamples,
  matches: FieldMatch[]
): string {
  const lines: string[] = [];

  config.classes.forEach((cls) => {
    lines.push(`### ${cls.title} (${cls.classKey})`);
    lines.push('');
    lines.push(`- **形状类型**: ${cls.shape.join(', ')}`);
    lines.push(`- **颜色**: ${cls.color}`);
    lines.push('');

    // 字段表格
    const fields = Object.entries(cls.tags);
    if (fields.length > 0) {
      lines.push('#### 字段说明');
      lines.push('');
      lines.push('| 字段名 | 类型 | 必填 | 说明 | 取值 |');
      lines.push('|--------|------|------|------|------|');

      fields.forEach(([tagKey, tagDef]) => {
        const match = matches.find(m => m.configField === tagKey);
        const description = match?.description || tagDef.title;

        let optionsStr = '';
        if (typeof tagDef.options === 'object' && tagDef.options !== null) {
          const optionEntries = Object.entries(tagDef.options);
          if (optionEntries.length <= 3) {
            optionsStr = optionEntries.map(([k, v]) => `${k}: ${v}`).join('<br>');
          } else {
            optionsStr = `${optionEntries.length} 个选项`;
          }
        } else if (tagDef.options === 'input') {
          optionsStr = '自由输入';
        }

        const multiStr = tagDef.multi ? '[]' : '';
        const requiredStr = tagDef.required ? '是' : '否';

        lines.push(`| \`${tagKey}\` | ${multiStr} | ${requiredStr} | ${description} | ${optionsStr} |`);
      });

      lines.push('');
    }

    // extraInfo 业务字段
    const extraFields = examples.extraInfoFields.get(cls.classKey);
    if (extraFields && extraFields.size > 0) {
      lines.push('#### 业务字段 (extraInfo)');
      lines.push('');
      lines.push('这些字段是 extraInfo 中与业务相关的字段：');
      lines.push('');
      lines.push('| 字段名 | 说明 |');
      lines.push('|--------|------|');

      Array.from(extraFields).forEach((field: string) => {
        // 尝试从文档中查找描述
        const docDesc = spec.fieldDescriptions.find(
          f => f.fieldName.toLowerCase() === field.toLowerCase()
        );
        const desc = docDesc?.description || '示例数据中发现的字段';
        lines.push(`| \`${field}\` | ${desc} |`);
      });

      lines.push('');
    }

    lines.push('');
  });

  return lines.join('\n');
}

/**
 * 生成字段匹配情况说明
 */
export function generateFieldMatchSummary(matches: FieldMatch[]): string {
  const exact = matches.filter(m => m.matchType === 'exact').length;
  const fuzzy = matches.filter(m => m.matchType === 'fuzzy').length;
  const unmatched = matches.filter(m => m.matchType === 'unmatched').length;

  const lines: string[] = [];
  lines.push('### 字段匹配情况');
  lines.push('');
  lines.push(`- **精确匹配**: ${exact} 个字段`);
  lines.push(`- **模糊匹配**: ${fuzzy} 个字段`);
  lines.push(`- **未匹配**: ${unmatched} 个字段`);
  lines.push('');

  if (unmatched > 0) {
    lines.push('#### 未匹配字段');
    lines.push('');
    lines.push('以下字段在文档中未找到对应描述，建议手动补充：');
    lines.push('');
    const unmatchedFields = matches
      .filter(m => m.matchType === 'unmatched')
      .map(m => `- \`${m.configField}\``);
    lines.push(...unmatchedFields);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * 生成取值说明
 */
export function generateValueOptionsDescription(
  config: ParsedConfig
): string {
  const lines: string[] = [];

  config.classes.forEach((cls) => {
    const fieldsWithOptions = Object.entries(cls.tags).filter(
      ([, tagDef]) => typeof tagDef.options === 'object' && tagDef.options !== null
    );

    if (fieldsWithOptions.length > 0) {
      lines.push(`### ${cls.title} - 取值说明`);
      lines.push('');

      fieldsWithOptions.forEach(([tagKey, tagDef]) => {
        if (typeof tagDef.options === 'object' && tagDef.options !== null) {
          lines.push(`#### ${tagKey}`);
          lines.push('');

          Object.entries(tagDef.options).forEach(([key, value]) => {
            lines.push(`- **\`${key}\`**: ${value}`);
          });

          lines.push('');
        }
      });
    }
  });

  return lines.join('\n');
}

/**
 * 生成数据示例
 */
export function generateDataExample(config: ParsedConfig): string {
  const lines: string[] = [];
  lines.push('### 数据示例');
  lines.push('');
  lines.push('```json');
  lines.push('{');
  lines.push('  "frames": [');
  lines.push('    {');
  lines.push('      "isSkip": false,');
  lines.push('      "isHardcase": false,');
  lines.push('      "currentBagTags": {},');
  lines.push('      "currentFrameIssueTags": {');
  lines.push('        "type": "shortDistance"');
  lines.push('      },');
  lines.push('      "objects": [');

  config.classes.forEach((cls, index) => {
    const tagFields = Object.entries(cls.tags).map(([key, def]) => {
      if (typeof def.options === 'object' && def.options !== null) {
        const firstOption = Object.keys(def.options)[0];
        return `        "${key}": "${firstOption}"`;
      }
      return `        "${key}": ""`;
    }).join(',\n');

    lines.push(`        // ${cls.title}`);
    lines.push('        {');
    lines.push(`          "annotationClass": "${cls.classKey}",`);
    lines.push(`          "type": "${cls.shape[0] || 'unknown'}",`);
    lines.push('          "tag": {');
    lines.push(tagFields);
    lines.push('          }');
    lines.push('        }' + (index < config.classes.length - 1 ? ',' : ''));
  });

  lines.push('      ]');
  lines.push('    }');
  lines.push('  ]');
  lines.push('}');
  lines.push('```');
  lines.push('');

  return lines.join('\n');
}
