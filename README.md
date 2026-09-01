# 薛俊轩的个人语录 — 大喜语录画廊

Pixtale 瀑布流克隆，纯静态，无后端，GitHub Pages 直接可用。

## 目录结构

```
gallery-project/
├── index.html              # 入口
├── app.js                  # 瀑布流 + 全屏 viewer 逻辑
├── style.css               # 样式
├── images/                 # 放图片的地方
├── images.json             # 自动生成的清单（勿手改）
├── generate-manifest.js    # 扫描脚本
├── package.json            # npm 脚本
└── xuejunxuan-icon.png     # favicon / 顶部 logo
```

## 在哪里执行命令

所有命令都在项目根目录执行：

```powershell
cd "C:\Users\Colin Roc\Documents\GitHub\gallery-project"
```

或直接在 VS Code 中打开 `gallery-project` 文件夹，打开终端（`Ctrl+``）即在正确目录。

> 需安装 Node.js (>=18)，可在 https://nodejs.org 下载。

## 日常使用

### 1. 自动监听模式（推荐）

新增/删除图片后自动重建 `images.json`，无需手动执行：

```powershell
# 方式一（推荐）
npm run watch

# 方式二
npm run dev

# 方式三（不装 npm 也可用）
node generate-manifest.js --watch
```

保持该窗口不要关闭。之后往 `images/` 拖入新图片、删除或重命名，控制台会打印：

```
[10:23:15] ✓ 已生成 images.json，共 26 张
```

回到浏览器刷新页面或点击右上角 **重新加载** 即可看到新图。

按 `Ctrl+C` 停止监听。

### 2. 单次生成

只想手动生成一次：

```powershell
npm run build
# 等同于
node generate-manifest.js
```

### 3. 本地预览

```powershell
# Python (自带)
python -m http.server 8000
# 然后浏览器打开 http://localhost:8000

# 或 Node
npx serve .
```

## 添加图片

1. 把 `jpg/jpeg/png/gif/webp/svg/bmp/avif` 直接丢进 `images/` 文件夹
2. 若已开启 `npm run watch`，自动完成；否则执行一次 `npm run build`
3. 刷新页面验证

> `images.json` 会自动按中文排序重建，无需手改。支持所有图片格式。

## 发布到 GitHub Pages

```powershell
git add images/ images.json
git commit -m "update images"
git push
```

在 GitHub 仓库 Settings → Pages 中选择 `Deploy from a branch` → `main / root`，访问地址为 `https://<用户名>.github.io/<仓库名>/`。

## 常见问题

- **新增图片不显示？** 确保 `npm run watch` 正在运行，或手动执行 `npm run build`，再刷新页面。
- **图片名含空格/中文？** 已自动 `encodeURIComponent` 处理，无需改名。
