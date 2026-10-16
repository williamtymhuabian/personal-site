# 用这个网站学会 Git 推送

Git 的基本过程是：工作区修改 → git add 选择本次修改 → git commit 保存本地版本 → git push 上传到 GitHub。提交成功与上传成功是两回事。

以下是操作教程，没有替你执行初始化、提交或远程推送。第一次建议逐段运行，遇到报错就停在那一步查看信息。

## 1. 在 GitHub 创建空仓库

登录 https://github.com/williamtymhuabian ，新建仓库，名字填写 `personal-site`。如果计划用 GitHub Free 发布 Pages，可选 Public。不要勾选初始化 README、.gitignore 或 License，因为本地已经有项目文件。

创建后记下仓库的 HTTPS 地址。若使用上述名称，应为：

```text
https://github.com/williamtymhuabian/personal-site.git
```

如果该名称已被使用，请换一个名称，并在下面的命令里替换地址。没有检查或覆盖你已有的任何仓库。

## 2. 进入正确的项目目录

打开 PowerShell：

```powershell
Set-Location -LiteralPath 'C:\Users\ASUS\Desktop\自媒体\personal-site'
git --version
node build.mjs
```

`Set-Location` 是进入文件夹。确保进入 personal-site，不要在桌面或上一级“自媒体”目录执行 git add，以免提交其他文件。

## 3. 初始化仓库并设置提交身份

这是新目录，首次执行：

```powershell
git init -b main
git config user.name "Williamtym"
git config user.email "替换成你的 GitHub 提交邮箱"
```

请先把邮箱替换为 GitHub Settings → Emails 中的邮箱，或那里提供的 noreply 邮箱。提交身份用于标记作者，不是登录凭据。这两条配置只影响当前项目。

## 4. 保存第一次本地版本

```powershell
git status
git add .
git status
git commit -m "Create personal website"
```

第一个 status 查看变化，add 暂存变化，第二个 status 核对即将提交的文件，commit 保存一个本地版本。仓库内只有网站项目，不包含原始证书。

## 5. 关联远程仓库并推送

```powershell
git remote add origin https://github.com/williamtymhuabian/personal-site.git
git remote -v
git push -u origin main
```

把 origin 理解为远程仓库的名字。main 是当前主分支，-u 记住它与远程分支的对应关系。

首次推送可能弹出浏览器登录窗口，按 Git Credential Manager 提示登录 GitHub 并授权。若终端要求密码，GitHub 普通账号密码不能用于 HTTPS Git 推送；按官方身份验证文档配置 Git Credential Manager 或个人访问令牌。令牌只在 Git 的受保护登录提示中使用，不要写进代码、远程 URL 或聊天。

完成后刷新仓库页面，确认 index.html、assets、content 等文件已经出现。

## 6. 开启网页发布

进入 GitHub 仓库的 Settings → Pages，按以下顺序设置：

1. Source 选择 Deploy from a branch。
2. Branch 选择 main。
3. Folder 选择 / (root)。
4. 点击 Save。

可在 Actions 中查看发布进度，最终地址以 Pages 页面显示为准。若仓库为 personal-site，通常是：

```text
https://williamtymhuabian.github.io/personal-site/
```

如果你希望使用不带项目名的地址 `https://williamtymhuabian.github.io/`，仓库名需要设为 `williamtymhuabian.github.io`，远程 URL 也改成对应仓库。

## 7. 以后更新文章

先编辑 content 里的文章，或修改 profile.json，再运行：

```powershell
node build.mjs
git status
git add .
git commit -m "Add a new note"
git push
```

第一行把 Markdown 生成网页，后三条核心 Git 命令完成保存和上传。提交说明可以写成更具体的内容，例如 Add binary search notes。Pages 会按新的推送重新发布。

## 常见情况

### fatal: not a git repository

检查 PowerShell 当前目录；进入 personal-site。尚未初始化时再执行 git init -b main。

### Author identity unknown

先执行第 3 步的 git config 设置姓名与邮箱，再重新提交。

### remote origin already exists

先运行 git remote -v 检查已有地址。如果确实指错了仓库，使用 git remote set-url origin 加正确的 HTTPS 仓库地址修改，不要盲目覆盖。

### src refspec main does not match any

运行 git status 和 git branch，确认已有第一次 commit，且分支名为 main。

### nothing to commit, working tree clean

当前没有未提交的文件变化，这不是故障。如果刚写了文章，确认文件已经保存，并运行过 node build.mjs。

### 推送被拒绝，提示 fetch first 或 non-fast-forward

说明远程分支包含本地没有的提交。先执行 git fetch origin 和 git log --oneline --graph --all -12 查看差异。若确认是同一个仓库的正常后续修改且工作区干净，可使用 git pull --rebase origin main 同步，然后再推送；遇到冲突先处理，不使用 git push --force。

如果是创建空仓库时误勾选了 README，可能涉及两套独立历史，先查看状态再处理，不照抄强制覆盖命令。

### 无法连接 GitHub 或等待超时

先确认浏览器能访问自己的仓库，以及网络是否正常。网络连接失败不等于本地提交丢失，可以在连接恢复后重试 git push。

## 官方参考

- https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-authentication-to-github
