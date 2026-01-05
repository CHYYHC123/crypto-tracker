import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 在 ESM 中模拟 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname, '..');
console.log('rootDir', rootDir);
const parentDir = path.dirname(rootDir);
console.log('parentDir', parentDir);

/**
 * 配置项
 */
const CONFIG = {
  projectName: 'Crypto Tracker',
  sourceDir: './src', // 你的源码目录
  outputFile: 'full_project_code.md',
  extensions: ['.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.json'],
  ignore: ['node_modules', 'dist', 'build', '.git', 'public', 'package-lock.json', 'merge-code.mjs']
};

/**
 * 获取某个文件夹下所有文件
 */
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    // console.log('fullPath', fullPath);
    // 基础过滤：跳过隐藏文件和被忽略的目录
    if (CONFIG.ignore.includes(file) || file.startsWith('.')) return;
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      const ext = path.extname(file);
      console.log('ext', ext);
      if (CONFIG.extensions.includes(ext)) arrayOfFiles.push(fullPath);
    }
  });
  return arrayOfFiles;
}

function mergeFiles() {
  console.log('🚀 开始扫描 React 项目文件 (ESM)...');
  // 检查源码目录是否存在
  if (!fs.existsSync(CONFIG.sourceDir)) {
    console.error(`❌ 错误：找不到目录 ${CONFIG.sourceDir}`);
    return;
  }
  const allFiles = getAllFiles(CONFIG.sourceDir);
  // console.log('allFiles', allFiles);
  let markdownContent = `# ${CONFIG.projectName}: ${path.basename(path.resolve())}\n\n这是一个 Chrome 扩展项目，名称为 **${CONFIG.projectName}**。\n\n下面展示的是该项目的源码结构及所在路径。`;
  // 1. 生成目录结构预览
  markdownContent += `## 1. 目录结构概览\n\`\`\`text\n`;
  allFiles.forEach(file => {
    markdownContent += `${path.relative(CONFIG.sourceDir, file)}\n`;
  });
  markdownContent += `\`\`\`\n\n---\n\n`;
  // 2. 合并文件内容
  allFiles.forEach(filePath => {
    // 1. 获取能让 fs.readFileSync 找到文件的真实完整路径
    const absolutePath = path.join(rootDir, filePath);
    // 2. 直接获取后缀名
    const ext = path.extname(filePath).substring(1);

    // console.log('absolutePath', absolutePath);

    // 3. 读取内容 (必须传入绝对路径)
    try {
      const content = fs.readFileSync(absolutePath, 'utf8');

      console.log(`正在读取: ${filePath}`); // 此时 filePath 就是 src/lib/utils.ts

      const displayPath = path.relative(parentDir, filePath);

      // 4. 写入 Markdown 时，直接使用那个干净的 filePath
      markdownContent += `## File: ${displayPath}\n`;
      markdownContent += `\`\`\`${ext}\n`;
      markdownContent += content;
      markdownContent += `\n\`\`\`\n\n---\n\n`;
    } catch (err) {
      console.error(`无法读取文件 ${absolutePath}:`, err.message);
    }
  });

  fs.writeFileSync(CONFIG.outputFile, markdownContent);
  console.log(`\n✅ 合并完成！`);
  console.log(`📄 已生成文档: ${CONFIG.outputFile}`);
  console.log(`📦 总文件数: ${allFiles.length}`);
}

mergeFiles();
