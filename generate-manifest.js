#!/usr/bin/env node
// 扫描 images 文件夹，生成 images.json
// 用法: node generate-manifest.js        # 单次生成
//       node generate-manifest.js --watch # 监听自动重建
const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, 'images');
const outFile = path.join(__dirname, 'images.json');
const exts = ['.jpg','.jpeg','.png','.gif','.webp','.svg','.bmp','.avif'];

function generate() {
  if (!fs.existsSync(imagesDir)) {
    console.error('images 文件夹不存在');
    return;
  }
  const files = fs.readdirSync(imagesDir)
    .filter(f => exts.includes(path.extname(f).toLowerCase()))
    .sort((a,b) => a.localeCompare(b, 'zh-CN'));

  const list = files.map((name, idx) => {
    const full = path.join(imagesDir, name);
    const stat = fs.statSync(full);
    const ext = path.extname(name).toLowerCase().slice(1);
    return {
      id: String(idx),
      name,
      src: `images/${encodeURIComponent(name)}`,
      rawSrc: `images/${name}`,
      size: stat.size,
      type: ext,
      mtime: stat.mtimeMs
    };
  });

  fs.writeFileSync(outFile, JSON.stringify(list, null, 2), 'utf-8');
  console.log(`[${new Date().toLocaleTimeString()}] ✓ 已生成 images.json，共 ${list.length} 张`);
}

generate();

if (process.argv.includes('--watch')) {
  console.log(`监听中: ${imagesDir} (新增/删除/重命名 自动重建)`);
  let timer = null;
  const debounce = () => {
    clearTimeout(timer);
    timer = setTimeout(generate, 300);
  };
  try {
    fs.watch(imagesDir, { recursive: false }, (event, filename) => {
      if (!filename) return debounce();
      if (exts.includes(path.extname(filename).toLowerCase())) debounce();
    });
  } catch {
    // Windows 递归不支持时降级
    fs.watch(imagesDir, debounce);
  }
  // 保持进程
  process.stdin.resume();
}
