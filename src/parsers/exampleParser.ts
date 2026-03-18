import type { ParsedExamples, DiscoveredField } from '../types';

/**
 * 解析示例数据文件
 * @param jsonContents 多个 JSON 文件内容数组
 * @returns 解析后的示例数据信息
 */
export function parseExampleFiles(jsonContents: string[]): ParsedExamples {
  const result: ParsedExamples = {
    fields: [],
    classes: new Set(),
    annotationTypes: new Set(),
    extraInfoFields: new Map(),
    sampleCount: jsonContents.length,
  };

  const fieldMap = new Map<string, DiscoveredField>();

  jsonContents.forEach((content) => {
    try {
      const data = JSON.parse(content);
      analyzeData(data, '', fieldMap, result);
    } catch (e) {
      console.warn('Failed to parse JSON:', e);
    }
  });

  result.fields = Array.from(fieldMap.values());

  return result;
}

/**
 * 递归分析数据结构
 */
function analyzeData(
  data: any,
  path: string,
  fieldMap: Map<string, DiscoveredField>,
  result: ParsedExamples
): void {
  if (data === null || data === undefined) return;

  const type = typeof data;

  if (type === 'object') {
    if (Array.isArray(data)) {
      // 数组类型
      data.forEach((item, index) => {
        if (index < 5) {
          // 只分析前5个元素避免过大
          analyzeData(item, path, fieldMap, result);
        }
      });
    } else {
      // 对象类型
      Object.entries(data).forEach(([key, value]) => {
        const newPath = path ? `${path}.${key}` : key;

        // 特殊处理 objects 数组中的标注对象
        if (key === 'objects' && Array.isArray(value)) {
          analyzeObjects(value, result);
        }

        // 记录字段信息
        recordField(newPath, key, value, fieldMap);

        // 递归分析子对象（限制深度）
        const depth = newPath.split('.').length;
        if (depth < 6) {
          analyzeData(value, newPath, fieldMap, result);
        }
      });
    }
  }
}

/**
 * 分析标注对象
 */
function analyzeObjects(objects: any[], result: ParsedExamples): void {
  objects.forEach((obj) => {
    if (obj.annotationClass) {
      result.classes.add(obj.annotationClass);
    }
    if (obj.type) {
      result.annotationTypes.add(obj.type);
    }

    // 分析 extraInfo 中的业务字段
    if (obj.extraInfo && typeof obj.extraInfo === 'object') {
      const classKey = obj.annotationClass || 'unknown';
      const existingFields = result.extraInfoFields.get(classKey) || new Set();

      Object.keys(obj.extraInfo).forEach((key) => {
        // 只记录业务相关字段
        if (isBusinessField(key)) {
          existingFields.add(key);
        }
      });

      result.extraInfoFields.set(classKey, existingFields);
    }

    // 分析 tag 字段
    if (obj.tag && typeof obj.tag === 'object') {
      const classKey = obj.annotationClass || 'unknown';
      const existingFields = result.extraInfoFields.get(classKey) || new Set();

      Object.keys(obj.tag).forEach((key) => {
        existingFields.add(key);
      });

      result.extraInfoFields.set(classKey, existingFields);
    }
  });
}

/**
 * 记录字段信息
 */
function recordField(
  path: string,
  fieldName: string,
  value: any,
  fieldMap: Map<string, DiscoveredField>
): void {
  // 只关注标注相关的字段
  if (!isRelevantField(path, fieldName)) return;

  const existing = fieldMap.get(path);

  if (existing) {
    // 更新现有字段
    const valueStr = String(value).slice(0, 100); // 限制长度
    if (existing.sampleValues.size < 10) {
      existing.sampleValues.add(valueStr);
    }
    existing.valueTypes.add(getValueType(value));
  } else {
    // 创建新字段
    const field: DiscoveredField = {
      fieldPath: path,
      fieldName,
      sampleValues: new Set([String(value).slice(0, 100)]),
      valueTypes: new Set([getValueType(value)]),
    };

    // 识别父类型
    const parts = path.split('.');
    if (parts.length >= 2) {
      field.parentType = parts[parts.length - 2];
    }

    fieldMap.set(path, field);
  }
}

/**
 * 判断是否为标注相关字段
 */
function isRelevantField(path: string, fieldName: string): boolean {
  // 忽略系统字段
  const systemFields = [
    'bagId',
    'clipId',
    'packageId',
    'projectId',
    'merge_data_uuid',
    'rawFrameId',
    'rawClipId',
    'prod_url',
    'raw_url',
    'mime',
    'device',
    'source',
  ];

  if (systemFields.includes(fieldName)) return false;

  // 只关注特定路径下的字段
  const relevantPaths = [
    'frames.',
    'objects.',
    'currentBagTags',
    'currentFrameIssueTags',
    'currentFrameTags',
    'tag.',
    'extraInfo.',
    'isSkip',
    'isHardcase',
  ];

  return relevantPaths.some((rp) => path.includes(rp));
}

/**
 * 判断是否为业务相关字段（在 extraInfo 中）
 */
function isBusinessField(fieldName: string): boolean {
  // 排除系统字段
  const systemFields = [
    'originProjectId',
    'color',
    'check',
    'created_at',
    'updated_at',
    'id',
    'uuid',
  ];

  return !systemFields.includes(fieldName);
}

/**
 * 获取值的类型
 */
function getValueType(value: any): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  return 'string';
}

/**
 * 获取示例数据中的脏签使用情况
 */
export function getDirtyTagUsage(
  jsonContents: string[]
): Map<string, { count: number; examples: string[] }> {
  const usage = new Map<string, { count: number; examples: string[] }>();

  jsonContents.forEach((content) => {
    try {
      const data = JSON.parse(content);

      // 检查包级别脏签
      if (data.frames && Array.isArray(data.frames)) {
        data.frames.forEach((frame: any) => {
          // 包脏签
          if (frame.currentBagTags?.type) {
            const tag = frame.currentBagTags.type;
            const existing = usage.get(tag) || { count: 0, examples: [] };
            existing.count++;
            if (existing.examples.length < 3) {
              existing.examples.push(frame.rawFrameId || 'unknown');
            }
            usage.set(tag, existing);
          }

          // 帧脏签
          if (frame.currentFrameIssueTags?.type) {
            const tag = frame.currentFrameIssueTags.type;
            const existing = usage.get(tag) || { count: 0, examples: [] };
            existing.count++;
            if (existing.examples.length < 3) {
              existing.examples.push(frame.rawFrameId || 'unknown');
            }
            usage.set(tag, existing);
          }
        });
      }
    } catch (e) {
      // ignore
    }
  });

  return usage;
}

/**
 * 分析数据质量
 */
export function analyzeDataQuality(jsonContents: string[]): {
  totalFrames: number;
  annotatedFrames: number;
  skipFrames: number;
  emptyObjects: number;
} {
  let totalFrames = 0;
  let annotatedFrames = 0;
  let skipFrames = 0;
  let emptyObjects = 0;

  jsonContents.forEach((content) => {
    try {
      const data = JSON.parse(content);

      if (data.frames && Array.isArray(data.frames)) {
        data.frames.forEach((frame: any) => {
          totalFrames++;

          if (frame.isSkip) {
            skipFrames++;
          }

          if (frame.objects && frame.objects.length > 0) {
            annotatedFrames++;

            // 检查是否有有效标注
            const hasValidAnnotation = frame.objects.some(
              (obj: any) =>
                obj.annotationClass && (obj.tag || obj.extraInfo)
            );
            if (!hasValidAnnotation) {
              emptyObjects++;
            }
          }
        });
      }
    } catch (e) {
      // ignore
    }
  });

  return {
    totalFrames,
    annotatedFrames,
    skipFrames,
    emptyObjects,
  };
}
