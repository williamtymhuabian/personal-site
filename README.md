# Williamtym · 探索手记

一个受 Hexo 博客形式启发的轻量个人网站。支持 Markdown 写作、文章分类与标签、归档、全文搜索、文章目录、浅色/深色主题、获奖记录和社交主页。适配手机和桌面。

这是独立的静态博客实现，不是 Hexo 安装包；不需要 npm install、数据库、第三方字体或 CDN。运行生成器需要 Node.js 18 或以上。本机已检测到 Node.js 和 Git。

## 立即查看

双击 `index.html` 即可查看完整网站（包含搜索和文章）。也可以在 PowerShell 中执行：

```powershell
Set-Location -LiteralPath 'C:\Users\ASUS\Desktop\自媒体\personal-site'
node build.mjs --serve
```

浏览器访问终端打印的地址，默认是 http://127.0.0.1:4173 。按 Ctrl+C 停止服务。如果端口占用，可在同一个 PowerShell 中先执行 `$env:PORT = '4174'` 再启动。

## 修改个人信息

编辑 `profile.json`：name、siteTitle、description、role、motto、socials、awards。已接入用户提供的 GitHub 与 CSDN；其他平台将 url 的空字符串替换为自己的完整 HTTPS 主页链接即可。

姓名、站点标题、侧栏身份与座右铭从 profile.json 自动读取。长篇自我介绍在 assets/app.js 的 renderAbout 中，修改经历时可编辑对应文案。所有修改完成后执行 node build.mjs，再刷新网页。

## 写新文章

在 `content` 中创建一个 UTF-8 Markdown 文件，例如 `my-first-experiment.md`。文件名用小写英文、数字和短横线，不能与已有文件重名。格式如下：

```markdown
---
title: 我的第一次小实验
date: 2026-10-16
category: 技术实践
summary: 用一句话说清这次解决了什么问题。
tags: 实验, 学习
pinned: false
---

## 问题是什么

这里开始正文。

## 我怎样尝试

- 第一步
- 第二步

## 结果与限制

写出实际结果，也留下尚未解决的问题。
```

保存后，在项目目录运行：

```powershell
node build.mjs
```

生成器会更新根目录 `index.html`。请编辑 `content/*.md`，不要直接在生成后的 `index.html` 里改文章，否则下一次生成会覆盖。

默认分类为建站手记、技术实践、历史阅读、随记。也可以使用新分类，导航中的分类与数量会自动统计。初始附带的四篇文章由本次建站起草，作为可编辑的开站内容；不代表已经在其他平台发表或是既往个人复盘。二分查找示例是说明性代码。

## 支持的 Markdown 范围

支持一级到三级标题、段落、粗体、行内代码、有序/无序列表、引用、分隔线、HTTPS/HTTP 链接和围栏代码块。代码块可用三个反引号或三个波浪号包围。暂不支持表格、嵌套列表、Markdown 图片、原生 HTML 和完整 CommonMark 扩展。

文章的原生 HTML 会转义显示，不会作为脚本执行。博客是纯前端静态站点，文章地址采用 `#/post/文章名`，无需配置服务器重写；支持 GitHub Pages 子目录。

## 文件职责

- `profile.json`：个人资料、社交链接与获奖摘要。
- `content/`：Markdown 文章源文件。
- `src/template.html`：页面 HTML 模板。
- `assets/`：页面样式、交互代码和图标。
- `build.mjs`：零依赖生成器与可选本地预览服务。
- `index.html`：生成好的网页，应一起提交到 GitHub。
- `.nojekyll`：让 GitHub Pages 按静态文件发布。
- `.gitignore`：忽略依赖、日志、临时文件和本地配置。
- `GIT_GUIDE.md`：以当前项目为例的 Git 与 GitHub Pages 操作说明。

## 奖项来源与证书

已只读查看用户指定证书目录中的四份代表性获奖图片，并整理文字摘要。没有修改、移动、重命名或删除证书文件，没有把证书原图复制进项目。网站没有展示证件号、证书号、签名和队友个人资料。

计算机设计大赛的作品按证书注明为团队作品、数媒静态设计—产品设计专业组；未据此推断个人分工或技术栈。专利相关文件未被展示，也未将受理材料表述为已获授权。

## 发布到 GitHub Pages

按 `GIT_GUIDE.md` 操作。此项目可使用 main 分支的 `/ (root)` 发布；每次改完文章先生成 `index.html` 再提交。当前交付为本地项目，尚未创建 GitHub 仓库、推送或公开发布。
