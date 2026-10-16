# 后续更新与材料申请

## 更新个人资料和社交账号

在 profile.json 修改学校、专业、研究方向等信息。certificateContact.email 是你明确同意公开的联系邮箱。不要放入登录密码、令牌或其他私有账号信息。

抖音和小红书数字账号不等同于平台网页的内部用户 ID。目前页面提供复制账号功能，访客在 App 内搜索。获得账号的“分享主页”完整链接后，再填写相应 social 的 url；不要直接拿数字账号拼接 user/profile 地址。

## 新增研究生竞赛记录

在 data/awards.json 数组里添加对象，注意对象之间使用英文逗号分隔。以下只是字段示例，发布前替换成真实获奖信息：

```json
{
  "id": "competition-2026-example",
  "year": "2026",
  "title": "实际赛事名称",
  "prize": "证书上的实际名次",
  "category": "具身智能",
  "level": "证书上的赛段",
  "detail": "实际赛道、组别与团队或个人属性。",
  "kind": "award",
  "phase": "苏州大学研究生阶段",
  "featured": false
}
```

id 必须唯一，使用小写英文、数字和短横线；后续修改奖项说明时保持 id 不变，申请记录就不会失去对应关系。kind 可为 award（竞赛获奖）、participation（参赛记录）、certification（专业认证）或 research（科研成果）。featured 为 true 的前三项显示在首页。

原始证书继续存放在当前公开项目之外。不要放入 assets、content、GitHub Issue、README 附件或公开仓库。需要记录原件位置时，只更新本地 `.private/certificate-index.json`；该目录不会被默认 git add 提交，也不会被网站生成器读取。不要使用 git add -f 强制提交这个目录。

## 新增项目

在 data/projects.json 数组追加项目：

```json
{
  "id": "embodied-project-example",
  "title": "你的实际项目名称",
  "year": "2026",
  "type": "个人项目",
  "status": "持续更新",
  "description": "解决什么问题、你的工作、已经完成的结果。",
  "tags": ["具身智能", "机器人"],
  "repoUrl": "",
  "demoUrl": "",
  "articleSlug": "",
  "awardIds": []
}
```

repoUrl 和 demoUrl 填真实完整 HTTPS 地址，没有则留空。articleSlug 可填 content 中的文章文件名（不含 .md），awardIds 可填已经存在的奖项 id。公开项目插图可放在 assets/projects/；此目录也不得用于存放证书原件。

## 收到材料申请后

1. 查看访客申请的记录编号、用途与所需范围。
2. 通过公开联系邮箱或私信确认对方身份与用途，决定是否提供。
3. 用本地 `.private/certificate-index.json` 查找原始证书所在位置。
4. 根据用途准备最少必要的材料副本；遮盖无关证件号、私人联系方式、二维码和队友信息，必要时加接收方、用途与日期水印。
5. 通过双方确认的私下渠道发送，不在公开 Issue 评论区上传。

站点只帮助整理申请内容，不自动授予访问权限、不保管原始证书、不自动发送材料。即使是获批材料，接收方也可能保存或转发，发送前仍需决定提供范围。

## 生成各平台发布稿

1. 先在 content 中写好文章，运行 node build.mjs。
2. 打开网站的“发布与订阅”，选择文章。
3. 选择 CSDN、小红书或抖音，复制或下载草稿。
4. 校对标题、事实、引用与素材，到相应平台编辑并确认发布。

CSDN 保留 Markdown 正文；小红书按摘要与小节整理短文；抖音按小节整理口播和画面建议。草稿不保证符合每个平台当时的全部格式要求，需要人工调整。

RSS 会随着文章构建更新。它提供网站订阅，不代表已向各个平台发布。

## 检查并推送更新

在项目目录执行：

```powershell
node --test privacy.test.mjs portfolio.test.mjs
node build.mjs
git status
git add .
git diff --cached --stat
git commit -m "Update portfolio and notes"
git push
```

如果构建提示存在证书、PDF、私有索引或敏感字段，请先核对并移出公开发布范围。git status 中不应出现 .private 下的文件。不要绕过检查直接提交原件。

提交后在仓库 Actions 查看部署结果，成功后刷新网站即可。


## VLN 动态背景与计算机实验室

背景由 assets/background.js 本地绘制，恢复机器人、无人机与无人车动画。进入“沉浸漫游”后，移动鼠标改变视角，点击地面设置共同目标；Esc 返回阅读。可暂停，尊重系统减少动态效果设置。独立的具身路径实验保留在 #/lab。

三个新增实验由 assets/computer-labs.js 与对应 CSS 维护，入口是 #/labs。深链接分别为 ?lab=sorting、?lab=neural、?lab=network。切换页面会停止计时器。

## 后续添加论文

在 data/papers.json 数组追加真实公开成果。所需字段如下；以下只用于说明字段，请替换所有示例内容后再保存：

```json
{
  "id": "your-paper-slug",
  "title": "真实论文标题",
  "authors": ["按照论文署名顺序填写"],
  "year": "2026",
  "venue": "正式会议、期刊或预印本平台",
  "status": "published",
  "abstract": "公开版本的摘要或简要介绍",
  "tags": ["VLN"],
  "doiUrl": "",
  "pdfUrl": "",
  "codeUrl": "",
  "bibtex": ""
}
```

status 只能选 published（正式发表）或 preprint（公开预印本）。投稿中、拟投稿与录用前稿件不要冒充已发表论文。链接填真实 HTTPS 地址，没有则留空；作者列表保持真实顺序。不要上传审稿意见、私人投稿截图或未获授权的附件。论文公开全文链接可以指向正式出版平台或作者合法公开版本，不需要把 PDF 原件放进仓库。

## ICPC / CCPC 公开证书

assets/public-honors/ 只保存 6 张经审核的永久脱敏 WebP（含学校名称、校徽文字遮盖）。data/public-certificates.json 保存公开标题与相对图片路径；不包含原件位置。图片文件名带内容摘要，防止浏览器沿用旧缓存。public-honors.mjs 保存对应 SHA256，构建时会检查文件没有被替换。

不要把原图直接覆盖这些文件。若需要更新公开副本，应在本地重新脱敏、去除元数据、逐张核对后，再更新精确白名单和摘要。其他原件仍使用人工申请流程。

## 收藏、点赞与留言

访客收藏无需登录，保存在当前浏览器。清理浏览器数据会丢失收藏；不会同步到其他设备。论文、手记、项目与实验都有收藏或交流入口。

留言与共享点赞走 GitHub Discussions，由站主安装 giscus 后启用；详见 COMMUNITY_GUIDE.md。不要把 GitHub 密码、登录令牌或应用私钥写入前端配置。
