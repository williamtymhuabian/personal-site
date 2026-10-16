---
title: 从本地到 GitHub：第一次推送个人网站
date: 2026-10-16
category: 建站手记
summary: 从一次本地提交开始，把个人网站放进 GitHub，再用 GitHub Pages 让它拥有自己的网址。
tags: Git, GitHub, 个人网站
pinned: true
---

Git 负责记录本地版本，GitHub 用来保存远程仓库，GitHub Pages 则负责把仓库中的网页发布出来。完成一次发布，需要依次走过这三个环节。

这是一篇随网站附带的入门手记。仓库名、邮箱等示例需要替换成自己的信息；下面的命令没有自动执行。

## 先在本地生成网页

打开 PowerShell，进入这个项目文件夹，生成网页：

~~~powershell
Set-Location -LiteralPath 'C:\Users\ASUS\Desktop\自媒体\personal-site'
node build.mjs
~~~

生成后的 `index.html` 可以直接双击打开。需要本地预览地址时，执行 `node build.mjs --serve`，再访问终端打印的地址。

## 建立本地版本记录

确认当前目录就是 personal-site。对于这个尚未初始化的新项目，依次执行：

~~~powershell
git init -b main
git config user.name "Williamtym"
git config user.email "替换成你的 GitHub 提交邮箱"
git status
git add .
git commit -m "Create personal website"
~~~

邮箱可以在 GitHub 的 Settings → Emails 中查看，也可以使用那里提供的 noreply 邮箱。这里的 `git config` 只设置当前仓库。

`git add` 选择准备记录的修改，`git commit` 在本地保存一次版本。完成 commit 后，文件仍然只在本地。

## 连接 GitHub 仓库并推送

在 GitHub 创建一个名为 `personal-site` 的空仓库。不要勾选自动添加 README、.gitignore 或 License，因为本地已经有文件。

然后连接远程仓库，并推送 main 分支：

~~~powershell
git remote add origin https://github.com/williamtymhuabian/personal-site.git
git remote -v
git push -u origin main
~~~

这里的远程地址以仓库名 personal-site 为例；如果使用其他名字，请换成新仓库页面显示的 HTTPS 地址。第一次连接时按 Git 的登录提示完成授权。GitHub 账号密码不能作为 HTTPS Git 推送密码；可通过 Git Credential Manager 的浏览器登录，或按官方说明配置令牌。

`origin` 是远程仓库的习惯名称，`main` 是分支名。首次使用 `-u` 建立对应关系，以后在这个分支直接 `git push` 即可。

## 把仓库变成网站

本项目已经包含生成后的网页。进入仓库的 Settings → Pages，选择 Deploy from a branch，再选 `main` 和 `/ (root)`，保存。

对于 GitHub Free，使用公开仓库可以启用 Pages。查看 Actions 中的发布进度，成功后以 Pages 页面显示的网址为准。若使用 personal-site 这个仓库名，通常对应 `https://williamtymhuabian.github.io/personal-site/`。

如果希望网址直接是 `https://williamtymhuabian.github.io/`，则创建同名仓库 `williamtymhuabian.github.io`，并相应修改远程地址。

## 以后更新只重复这几步

编辑 `profile.json` 或 `content` 中的 Markdown 文件后：

~~~powershell
node build.mjs
git status
git add .
git commit -m "Update notes"
git push
~~~

`node build.mjs` 把文章改动写入网页，`git push` 把新版本发送到 GitHub。Pages 开启后会根据新的推送再次发布。

如果提示没有新内容可以提交，先用 `git status` 检查是否确实修改并保存了文件。如果提示远程已有更新，先查看双方差异；不要用强制推送覆盖不明来源的提交。

## 参考资料

- [GitHub 官方：添加本地代码到 GitHub](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github)
- [GitHub 官方：配置 Pages 发布来源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [GitHub 官方：身份验证方式](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-authentication-to-github)
