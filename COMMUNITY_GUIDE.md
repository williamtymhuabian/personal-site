# 留言与共享点赞

网站使用 [giscus](https://github.com/giscus/giscus) 把评论和表情点赞保存到 GitHub Discussions。访客登录自己的 GitHub 账号后留言。收藏独立保存在访客本机，不需要登录。

## 已准备的设置

- 仓库：williamtymhuabian/personal-site，Discussions 已开启。
- 分类：General。
- 仓库 ID 与分类 ID 已写入 data/community.json；这些是公开标识，不是登录凭据。
- 每篇手记、项目、论文、实验室、城市足迹和期刊会议使用独立主题；没有指定主题时进入网站公共留言板。
- 应用未安装时不伪造评论或点赞，保留 GitHub 留言和邮箱联系入口。
- `enabled: true` 表示允许连接。页面会先通过 giscus 官方公开接口核对安装状态、仓库 ID 和分类，核对通过后才加载站内组件；不代表应用已经安装。

## 站主完成首次安装

1. 打开 [官方 giscus 安装页面](https://github.com/apps/giscus/installations/new)，自行登录 GitHub。
2. 选择 **Only select repositories**，只勾选 **personal-site**，核对应用权限后确认安装。
3. 回到网站“留言与交流”，点击“重新连接”，或刷新页面。已部署的页面会自动核对安装结果，无须为安装再次修改代码。
4. 应看到 giscus 登录、评论与反应区。访客登录自己的 GitHub 账号后可以留言和点赞；内容将公开保存在仓库 Discussions 中。
5. 如仍出现未开通提示，检查安装时是否选中了本仓库、Discussions 是否开启，以及 General 分类是否仍存在。也可以告诉网站维护助手“已安装”，由其核对公开配置。

giscus 需要选定仓库的讨论区读写权限和基础元数据权限。安装范围不要选所有仓库。无需把密码、GitHub 令牌或 giscus 应用密钥填进这个项目。

## 日常维护

在仓库 Discussions 管理评论。每个主题以“Williamtym · 内容标识”映射；文章 slug、项目 id、论文 id、城市 id 和会议 id 改动会影响讨论关联，建议保持稳定。旧实验室的 sorting、neural、network 标识已保留。点赞使用讨论区的真实 reactions，不显示本机模拟的全站计数。

站内组件使用严格匹配：生成器为完整话题字符串计算 SHA-1，并写入公开的 `communityHashes`。备用入口预填的 GitHub 讨论正文也包含同一 `<!-- sha1: ... -->` 标记，因此安装组件后仍能找到这些讨论。该标记是关联标识，不是密码；发起讨论时请保留它。早期手动创建且缺少标记的主题，需要维护者核对后补入对应标记才能被严格匹配找到。

备用输入框只准备内容和链接，访客必须在 GitHub 页面确认发布；建议先查找已有主题并回复，避免重复发帖。期刊会议页面的本机准备笔记不会自动带入留言。GitHub 登录返回时会恢复上次交流话题，登录会话由官方 giscus 客户端处理，项目代码不读取或输出凭据。

评论组件无法加载时，页面会提供 GitHub 交流入口。公开留言请勿填写私人联系方式、证件信息或上传未经脱敏的证书。原件核验继续使用邮件或双方确认的私信渠道。

修改代码后的检查：`node --test community.test.mjs privacy.test.mjs portfolio.test.mjs journey.test.mjs explore.test.mjs`，再执行 `node build.mjs`，将源码与生成的 index.html 一起提交。模拟组件测试不能代替真实安装和登录后的人工检查；不要替访客发布测试留言。
