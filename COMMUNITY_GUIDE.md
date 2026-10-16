# 留言与共享点赞

网站使用 [giscus](https://github.com/giscus/giscus) 把评论和表情点赞保存到 GitHub Discussions。访客登录自己的 GitHub 账号后留言。收藏独立保存在访客本机，不需要登录。

## 已准备的设置

- 仓库：williamtymhuabian/personal-site，Discussions 已开启。
- 分类：General。
- 仓库 ID 与分类 ID 已写入 data/community.json；这些是公开标识，不是登录凭据。
- 每篇手记、项目、论文和实验使用独立主题；没有指定主题时进入网站公共留言板。
- 应用未安装时不伪造评论或点赞，保留 GitHub 留言和邮箱联系入口。

## 站主完成首次安装

1. 打开 [官方 giscus 安装页面](https://github.com/apps/giscus/installations/new)，自行登录 GitHub。
2. 选择 **Only select repositories**，只勾选 **personal-site**，核对应用权限后确认安装。
3. 告诉网站维护助手“已安装”，或自行把 data/community.json 的 enabled 改为 true。
4. 执行 `node --test privacy.test.mjs portfolio.test.mjs`、`node build.mjs`，提交并推送。
5. 打开网站“留言与交流”，应看到 giscus 登录、评论与反应区。登录自己的 GitHub 账号后，可以测试留言；测试内容将是公开的。

giscus 需要选定仓库的讨论区读写权限和基础元数据权限。安装范围不要选所有仓库。无需把密码、GitHub 令牌或 giscus 应用密钥填进这个项目。

## 日常维护

在仓库 Discussions 管理评论。每个主题以“Williamtym · 内容标识”映射；文章 slug、项目 id、论文 id 改动会影响讨论关联，建议保持稳定。点赞使用讨论区的真实 reactions，不显示本机模拟的全站计数。

评论组件无法加载时，页面会提供 GitHub 交流入口。公开留言请勿填写私人联系方式、证件信息或上传未经脱敏的证书。原件核验继续使用邮件或双方确认的私信渠道。
