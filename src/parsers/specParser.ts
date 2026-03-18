import type {
  ParsedSpec,
  FieldDescription,
  DirtyTagDescription,
} from '../types';

/**
 * 解析标注规范 Markdown 文档
 * @param markdownContent Markdown 文档内容
 * @returns 解析后的规范对象
 */
export function parseSpecDocument(markdownContent: string): ParsedSpec {
  const result: ParsedSpec = {
    fieldDescriptions: [],
    dirtyTagDescriptions: [],
    rawContent: markdownContent,
  };

  // 提取标题
  const titleMatch = markdownContent.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    result.title = titleMatch[1].trim();
  }

  // 解析表格 - 提取脏数据说明和字段说明
  const tables = extractTables(markdownContent);

  tables.forEach((table) => {
    const parsedTable = parseTableContent(table);

    // 判断表格类型
    if (isDirtyTagTable(parsedTable)) {
      const dirtyTags = extractDirtyTagsFromTable(parsedTable);
      result.dirtyTagDescriptions.push(...dirtyTags);
    } else if (isFieldDescriptionTable(parsedTable)) {
      const fields = extractFieldsFromTable(parsedTable);
      result.fieldDescriptions.push(...fields);
    }
  });

  // 从正文中提取字段描述
  const textDescriptions = extractDescriptionsFromText(markdownContent);

  // 合并表格和文本中提取的描述，去重
  textDescriptions.forEach((desc) => {
    const existing = result.fieldDescriptions.find(
      (f) => f.fieldName.toLowerCase() === desc.fieldName.toLowerCase()
    );
    if (!existing) {
      result.fieldDescriptions.push(desc);
    }
  });

  return result;
}

/**
 * 从 Markdown 中提取所有表格
 */
function extractTables(content: string): string[] {
  const tables: string[] = [];
  const tableRegex = /\|[^|]+\|[^|]+\|[\s\S]*?(?=\n\n|\n#{1,6}\s|$)/g;

  let match;
  while ((match = tableRegex.exec(content)) !== null) {
    tables.push(match[0].trim());
  }

  return tables;
}

/**
 * 解析表格内容为结构化数据
 */
function parseTableContent(tableContent: string): {
  headers: string[];
  rows: string[][];
  rawContent: string;
} {
  const lines = tableContent.split('\n').filter((line) => line.trim());

  if (lines.length < 2) {
    return { headers: [], rows: [], rawContent: tableContent };
  }

  // 解析表头
  const headerLine = lines[0];
  const headers = headerLine
    .split('|')
    .map((h) => h.trim())
    .filter((h) => h);

  // 跳过分隔线（第二行通常是 ---|---|--- ）
  const dataLines = lines.slice(2);

  // 解析数据行
  const rows = dataLines.map((line) => {
    return line
      .split('|')
      .map((cell) => cell.trim())
      .filter((_, index, arr) => index > 0 && index < arr.length - 1 || arr.length <= 2);
  });

  return { headers, rows, rawContent: tableContent };
}

/**
 * 判断是否为脏数据说明表
 */
function isDirtyTagTable(table: {
  headers: string[];
  rows: string[][];
}): boolean {
  const headerText = table.headers.join(' ').toLowerCase();
  return (
    headerText.includes('脏') ||
    headerText.includes('type') ||
    headerText.includes('含义') ||
    headerText.includes('处理')
  );
}

/**
 * 判断是否为字段说明表
 */
function isFieldDescriptionTable(table: {
  headers: string[];
  rows: string[][];
}): boolean {
  const headerText = table.headers.join(' ').toLowerCase();
  return (
    headerText.includes('字段') ||
    headerText.includes('key') ||
    headerText.includes('说明') ||
    headerText.includes('类型')
  );
}

/**
 * 从表格中提取脏数据标签说明
 */
function extractDirtyTagsFromTable(table: {
  headers: string[];
  rows: string[][];
}): DirtyTagDescription[] {
  const dirtyTags: DirtyTagDescription[] = [];

  // 查找关键列的索引
  const headers = table.headers.map((h) => h.toLowerCase());
  const valueIndex = headers.findIndex(
    (h) => h.includes('值') || h.includes('type') || h.includes('标签')
  );
  const meaningIndex = headers.findIndex(
    (h) => h.includes('含义') || h.includes('说明') || h.includes('描述')
  );
  const handlingIndex = headers.findIndex(
    (h) => h.includes('处理') || h.includes('建议') || h.includes('使用')
  );

  table.rows.forEach((row) => {
    if (row.length >= 2) {
      const tagValue =
        valueIndex >= 0 ? extractValueFromCell(row[valueIndex]) : extractValueFromCell(row[0]);
      const meaning =
        meaningIndex >= 0 ? row[meaningIndex] : row[1] || '';
      const handlingSuggestion =
        handlingIndex >= 0 ? row[handlingIndex] : row[2] || '根据具体情况判断';

      if (tagValue) {
        // 自动判断级别
        const level = detectTagLevel(tagValue);

        dirtyTags.push({
          tagValue,
          meaning: cleanCellContent(meaning),
          handlingSuggestion: cleanCellContent(handlingSuggestion),
          level,
        });
      }
    }
  });

  return dirtyTags;
}

/**
 * 从表格中提取字段说明
 */
function extractFieldsFromTable(table: {
  headers: string[];
  rows: string[][];
}): FieldDescription[] {
  const fields: FieldDescription[] = [];

  const headers = table.headers.map((h) => h.toLowerCase());
  const nameIndex = headers.findIndex(
    (h) => h.includes('字段') || h.includes('key') || h.includes('名称')
  );
  const descIndex = headers.findIndex(
    (h) => h.includes('说明') || h.includes('含义') || h.includes('描述')
  );
  const valueIndex = headers.findIndex(
    (h) => h.includes('取值') || h.includes('类型') || h.includes('选项')
  );

  table.rows.forEach((row) => {
    if (row.length >= 2) {
      const fieldName =
        nameIndex >= 0 ? extractFieldName(row[nameIndex]) : extractFieldName(row[0]);
      const description =
        descIndex >= 0 ? row[descIndex] : row[1] || '';
      const values =
        valueIndex >= 0 ? extractValues(row[valueIndex]) : [];

      if (fieldName) {
        fields.push({
          fieldName,
          description: cleanCellContent(description),
          values: values.length > 0 ? values : undefined,
          tableContext: table.headers.join(' '),
        });
      }
    }
  });

  return fields;
}

/**
 * 从正文中提取字段描述
 */
function extractDescriptionsFromText(content: string): FieldDescription[] {
  const fields: FieldDescription[] = [];

  // 匹配常见的字段描述模式
  // 例如："* 断头路ID：..." 或 "- iD: ..."
  const patterns = [
    /[\*\-]\s*(\w+)\s*[：:]\s*(.+?)(?=\n[\*\-]|\n#{1,6}\s|$)/gs,
    /(\w+)\s*[:：]\s*(.+?)(?=\n\w+\s*[:：]|\n#{1,6}\s|$)/gs,
  ];

  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const fieldName = match[1].trim();
      const description = match[2].trim().replace(/\n+/g, ' ');

      // 过滤掉一些非字段的内容
      if (
        fieldName.length > 1 &&
        fieldName.length < 50 &&
        !fieldName.includes('http') &&
        description.length > 5
      ) {
        fields.push({
          fieldName,
          description,
        });
      }
    }
  });

  return fields;
}

/**
 * 从单元格内容中提取值（处理 JSON 代码块等）
 */
function extractValueFromCell(cell: string): string {
  if (!cell) return '';

  // 尝试提取 JSON 中的值
  const jsonMatch = cell.match(/"type"\s*:\s*"([^"]+)"/);
  if (jsonMatch) {
    return jsonMatch[1];
  }

  // 提取代码块或普通文本
  const codeMatch = cell.match(/`([^`]+)`/);
  if (codeMatch) {
    return codeMatch[1];
  }

  return cell.trim();
}

/**
 * 从单元格中提取字段名
 */
function extractFieldName(cell: string): string {
  if (!cell) return '';

  // 提取代码块中的字段名
  const codeMatch = cell.match(/`([^`]+)`/);
  if (codeMatch) {
    return codeMatch[1];
  }

  // 提取 Key: "xxx" 格式
  const keyMatch = cell.match(/["']?(\w+)["']?\s*[:：]/);
  if (keyMatch) {
    return keyMatch[1];
  }

  return cell.trim();
}

/**
 * 从单元格中提取可能的取值列表
 */
function extractValues(cell: string): string[] {
  if (!cell) return [];

  // 匹配逗号分隔或顿号分隔的列表
  const values = cell
    .split(/[,，、;；]/)
    .map((v) => v.trim())
    .filter((v) => v.length > 0);

  return values;
}

/**
 * 清理单元格内容
 */
function cleanCellContent(cell: string): string {
  if (!cell) return '';

  return cell
    .replace(/<[^>]+>/g, '') // 移除 HTML 标签
    .replace(/!\[.*?\]\(.*?\)/g, '') // 移除图片
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 将链接转为文本
    .replace(/\n+/g, ' ') // 将换行转为空格
    .trim();
}

/**
 * 自动判断标签级别
 */
function detectTagLevel(tagValue: string): 'bag' | 'frame' | undefined {
  const bagKeywords = ['nonexistent', 'indeterminacy', 'parking', 'notunique', 'network'];
  const frameKeywords = ['distance', 'short', 'medium', 'long'];

  const lowerValue = tagValue.toLowerCase();

  if (bagKeywords.some((kw) => lowerValue.includes(kw))) {
    return 'bag';
  }
  if (frameKeywords.some((kw) => lowerValue.includes(kw))) {
    return 'frame';
  }

  return undefined;
}

/**
 * 合并配置和文档中的脏签信息
 */
export function mergeDirtyTagInfo(
  configTags: { value: string; label: string; level: 'bag' | 'frame' }[],
  docTags: DirtyTagDescription[]
): DirtyTagDescription[] {
  const merged = new Map<string, DirtyTagDescription>();

  // 先添加配置中的标签
  configTags.forEach((tag) => {
    merged.set(tag.value, {
      tagValue: tag.value,
      meaning: tag.label,
      level: tag.level,
      handlingSuggestion: '',
    });
  });

  // 合并文档中的描述
  docTags.forEach((tag) => {
    const existing = merged.get(tag.tagValue);
    if (existing) {
      existing.meaning = tag.meaning || existing.meaning;
      existing.handlingSuggestion =
        tag.handlingSuggestion || existing.handlingSuggestion;
      if (tag.level) {
        existing.level = tag.level;
      }
    } else {
      merged.set(tag.tagValue, tag);
    }
  });

  return Array.from(merged.values());
}
