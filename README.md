# CodeExtractor

把代码提取成 AI 可读格式的桌面工具，专为代码审查场景设计。

## 功能

- **目录树浏览** — 勾选文件/文件夹，自动尊重 `.gitignore`
- **多格式导出** — 纯文本 / Markdown / XML（适配 Claude）
- **Token 预算** — 实时估算已选文件的 token 用量，进度条可视化（100万上限）
- **搜索与过滤** — 支持普通搜索和 Glob 模式（`*.ts`、`src/**/*.tsx`）
- **提示词模板** — 内置安全审查、性能优化、找 Bug 等快捷模板；支持自定义前缀/后缀
- **选择预设** — 保存常用文件组合，一键载入
- **输出预览** — 内置查看器，语法高亮浏览待发送内容
- **持久化** — 配置、选中文件、预设跨会话保留

## 快捷键

| 按键 | 功能 |
|------|------|
| `F5` | 刷新所有目录 |
| `Ctrl+Shift+C` | 复制全部选中内容 |
| `Ctrl+Shift+E` | 导出到文件 |
| `?` | 快捷键帮助 |
| `Escape` | 清除搜索框 |

## 技术栈

Tauri 2 + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui

## 开发

```bash
npm install
npm run tauri dev
```

## 构建

```bash
npm run tauri build
```
