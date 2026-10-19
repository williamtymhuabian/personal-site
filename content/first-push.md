---
title: 从本地到GitHub：第一次推送个人网站
date: 2026-10-16
category: 建站手记
summary: 从一次本地提交开始，把个人网站放进GitHub，再用GitHub Pages让它拥有自己的网址。
tags: Git, GitHub, 个人网站
pinned: true
---

Git负责记录本地版本，GitHub用来保存远程仓库，GitHub Pages则负责把仓库中的网页发布出来。完成一次发布，需要依次走过这三个环节。

这个网站也是按这条流程发布的。下面把首次上传和日常更新分开记录；第一次使用Git时，先确认终端所在目录，再执行命令。

## 先在本地生成网页

打开PowerShell，进入项目文件夹后生成网页。这里用示例路径，替换成自己的位置：

~~~powershell
Set-Location -LiteralPath 'C:\projects\personal-site'
node build.mjs
~~~

生成后的`index.html`可以直接双击打开。需要本地预览地址时，执行`node build.mjs --serve`，再访问终端打印的地址。

## 建立本地版本记录

确认当前目录就是personal-site。以下初始化命令用于尚未建立Git仓库的新项目；已经能提交的网站直接看文末的更新步骤。

~~~powershell
git init -b main
git config user.name "Williamtym"
git config user.email "替换成你的 GitHub 提交邮箱"
git status
git add .
git commit -m "Create personal website"
~~~

邮箱可以在GitHub的Settings → Emails中查看，也可以使用那里提供的noreply邮箱。这里的`git config`只设置当前仓库。

提交邮箱用于标记作者身份，不负责登录GitHub。登录邮箱可以作为提交邮箱，也可以选择GitHub提供的noreply邮箱；仓库关联作者需要对应邮箱已加入账号。希望减少公开邮箱信息时，用noreply地址更合适。[GitHub提交邮箱说明](https://docs.github.com/en/account-and-profile/how-tos/email-preferences/setting-your-commit-email-address)

`git add`选择准备记录的修改，`git commit`在本地保存一次版本。完成commit后，文件仍然只在本地。

## 连接GitHub仓库并推送

在GitHub创建一个名为`personal-site`的空仓库。不要勾选自动添加README、.gitignore或License，因为本地已经有文件。

然后连接远程仓库，并推送main分支：

~~~powershell
git remote add origin https://github.com/williamtymhuabian/personal-site.git
git remote -v
git push -u origin main
~~~

这里的远程地址以仓库名personal-site为例；如果使用其他名字，请换成新仓库页面显示的HTTPS地址。第一次连接时按Git的登录提示完成授权。GitHub账号密码不能作为HTTPS Git推送密码；可通过Git Credential Manager的浏览器登录，或按官方说明配置令牌。

`origin`是远程仓库的习惯名称，`main`是分支名。首次使用`-u`建立对应关系，以后在这个分支直接`git push`即可。

## 把仓库变成网站

本项目已经包含生成后的网页。进入仓库的Settings → Pages，选择Deploy from a branch，再选`main`和`/ (root)`，保存。

对于GitHub Free，使用公开仓库可以启用Pages。查看Actions中的发布进度，成功后以Pages页面显示的网址为准。若使用personal-site这个仓库名，通常对应`https://williamtymhuabian.github.io/personal-site/`。

如果希望网址直接是`https://williamtymhuabian.github.io/`，则创建同名仓库`williamtymhuabian.github.io`，并相应修改远程地址。

## 以后更新只重复这几步

编辑`profile.json`或`content`中的Markdown文件后：

~~~powershell
node build.mjs
git status
git add .
git commit -m "Update notes"
git push
~~~

`node build.mjs`把文章改动写入网页，`git push`把新版本发送到GitHub。Pages开启后会根据新的推送再次发布。

如果提示没有新内容可以提交，先用`git status`检查是否确实修改并保存了文件。如果提示远程已有更新，先查看双方差异；不要用强制推送覆盖不明来源的提交。

## 参考资料

- [GitHub官方：添加本地代码到GitHub](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github)
- [GitHub官方：配置Pages发布来源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [GitHub官方：身份验证方式](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-authentication-to-github)
