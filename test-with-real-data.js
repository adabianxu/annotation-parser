// 使用真实断头路数据测试解析和生成功能
const fs = require('fs');
const path = require('path');

// 模拟导入解析器和生成器（因为它们是ES模块，我们用动态导入）
async function testWithRealData() {
  console.log('🧪 开始使用断头路数据进行测试...\n');

  const dataDir = '/Users/ada.xu1/Desktop/MIL/BL350/断头路/16319163609000522_2026031217';
  const specPath = '/Users/ada.xu1/Desktop/MIL/BL350/断头路/断头路标注规范评测集/断头路标注规范评测集.md';

  // 1. 读取文件
  console.log('📖 读取文件...');

  const specContent = fs.readFileSync(specPath, 'utf-8');
  console.log(`  ✓ 规范文档: ${(specContent.length / 1024).toFixed(2)} KB`);

  const configPath = path.join(dataDir, 'label_rule_VLA_TSR_1STEP_NO_REFINE_1.json');
  const configContent = fs.readFileSync(configPath, 'utf-8');
  console.log(`  ✓ 配置文件: ${(configContent.length / 1024).toFixed(2)} KB`);

  const exampleFiles = [
    '69ae7003721b587cd25ee46f.json',
    '69ae700383f2493f72e8fde1.json'
  ];

  const exampleContents = exampleFiles.map(f => {
    const content = fs.readFileSync(path.join(dataDir, f), 'utf-8');
    console.log(`  ✓ 示例数据 ${f}: ${(content.length / 1024).toFixed(2)} KB`);
    return content;
  });

  console.log('\n🔍 开始解析...\n');

  try {
    // 动态导入ES模块
    const { parseConfig, parseSpecDocument, parseExampleFiles, matchFields } = await import('./src/parsers/index.ts');
    const { generateDocument } = await import('./src/generators/index.ts');

    // 2. 解析规范文档
    console.log('📝 解析规范文档...');
    const parsedSpec = parseSpecDocument(specContent);
    console.log(`  ✓ 提取字段描述: ${parsedSpec.fieldDescriptions.length} 个`);
    console.log(`  ✓ 提取脏签描述: ${parsedSpec.dirtyTagDescriptions.length} 个`);

    // 3. 解析配置文件
    console.log('⚙️  解析配置文件...');
    const parsedConfig = parseConfig(configContent);
    console.log(`  ✓ 标注类型: ${parsedConfig.classes.length} 个`);
    console.log(`  ✓ 包脏签: ${Object.keys(parsedConfig.bagTags).length} 个类型`);
    console.log(`  ✓ 帧脏签: ${Object.keys(parsedConfig.frameIssueTags).length} 个类型`);
    console.log(`  ✓ 脏签总数: ${parsedConfig.dirtyTags.length} 个`);

    // 4. 解析示例数据
    console.log('📊 解析示例数据...');
    const parsedExamples = parseExampleFiles(exampleContents);
    console.log(`  ✓ 发现标注类: ${parsedExamples.classes.size} 个`);
    console.log(`  ✓ 发现字段: ${parsedExamples.fields.length} 个`);
    console.log(`  ✓ extraInfo字段: ${parsedExamples.extraInfoFields.size} 个类`);

    // 5. 字段匹配
    console.log('🔗 字段匹配...');
    const matches = matchFields(parsedConfig, parsedSpec);
    const exact = matches.filter(m => m.matchType === 'exact').length;
    const fuzzy = matches.filter(m => m.matchType === 'fuzzy').length;
    const unmatched = matches.filter(m => m.matchType === 'unmatched').length;
    console.log(`  ✓ 精确匹配: ${exact} 个`);
    console.log(`  ✓ 模糊匹配: ${fuzzy} 个`);
    console.log(`  ✓ 未匹配: ${unmatched} 个`);

    // 6. 生成文档
    console.log('\n📄 生成文档...');
    const document = generateDocument(parsedConfig, parsedSpec, parsedExamples, matches);
    console.log(`  ✓ 文档大小: ${(document.length / 1024).toFixed(2)} KB`);

    // 7. 保存生成的文档
    const outputPath = '/Users/ada.xu1/Desktop/cluadecode_project/generate_anno_usemd/web/test-output.md';
    fs.writeFileSync(outputPath, document);
    console.log(`  ✓ 文档已保存到: ${outputPath}`);

    // 8. 显示文档预览
    console.log('\n📋 文档预览（前2000字符）:');
    console.log('─'.repeat(80));
    console.log(document.substring(0, 2000));
    console.log('...');
    console.log('─'.repeat(80));

    console.log('\n✅ 测试完成！');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error.stack);
  }
}

testWithRealData();
