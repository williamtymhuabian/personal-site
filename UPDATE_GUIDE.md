# 后续更新与材料申请

## 更新个人资料和社交账号

在 profile.json 修改学校、专业、研究方向等信息。certificateContact.email 是你明确同意公开的联系邮箱。不要放入登录密码、令牌或其他私有账号信息。

抖音、小红书和视频号账号不等同于平台网页的内部用户 ID。目前页面提供复制账号功能，访客在 App 内搜索。获得账号的“分享主页”完整链接后，再填写相应 social 的 url；不要直接拿数字账号拼接 user/profile 地址。

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

原排序、神经元和路由实验由 assets/computer-labs.js 与对应 CSS 维护；#/labs 现在按十个主领域组织，其余教学示例由 assets/field-labs.js 维护。原深链接 ?lab=sorting、?lab=neural、?lab=network 继续可用。切换页面会停止计时器。

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

assets/public-honors/ 只保存已审核且获准公开的 WebP。当前算法竞赛按站主选择完整展示校名、姓名、编号与二维码等竞赛信息。data/public-certificates.json 按奖项保存公开标题、主证书及 items 图片数组；不包含原件位置。图片文件名带内容摘要，防止浏览器沿用旧缓存。public-honors.mjs 保存对应 SHA256，构建时会检查文件没有被替换。

不要直接覆盖这些文件。更新公开副本时，应按站主选择的公开范围处理、去除额外元数据、逐张核对后，再更新精确白名单和摘要。其他类别仍使用人工申请流程。

## 收藏、点赞与留言

访客收藏无需登录，保存在当前浏览器。清理浏览器数据会丢失收藏；不会同步到其他设备。论文、手记、项目与实验都有收藏或交流入口。

留言与共享点赞走 GitHub Discussions，站主安装 giscus 后，刷新留言页即可自动核对并连接；详见 COMMUNITY_GUIDE.md。未安装时仍可准备草稿并前往 GitHub 确认发起讨论，预填正文中的话题标记请保留，方便以后关联。不要把 GitHub 密码、登录令牌或应用私钥写入前端配置。


## 给同一奖项添加奖牌或更多图片

在 data/public-certificates.json 对应奖项的 items 中添加已经审核并确认公开范围的图片信息：image、alt、kind（certificate 或 medal）、width、height。主证书放在第一张，保留该组 image/alt 与第一张一致。

每组一张单图、两张并列、三张及以上自动出现轮播控件。不要靠重复图片凑轮播，也不要改变奖项数量。公开前逐张核对已取得对应范围的公开授权，且没有 EXIF 等额外元数据。disclosure 必须明确填写 complete（完整竞赛信息）或 redacted（按选择脱敏）。更新精确白名单与 SHA256，再构建。

本科国家级大创条目的 id 是 national-undergraduate-innovation。已填写 2024 年立项的“面向 AIoT 应用的空地协同推理方法”，本人角色为项目成员。后续更新具体工作或结题情况时修改该项目即可，不要新增重复项目。科研项目经历不计入竞赛获奖数。


## 更新教育经历和竞赛足迹

- 当前身份修改 `profile.json` 的学校、专业、学历与 role；完整教育经历在 `educationHistory` 中维护，月份为 YYYY-MM，当前阶段 end 为空。首页不堆叠完整时间线，头像链接会进入教育经历区。
- `data/journeys.json` 按城市维护 longitude / latitude（城市中心）与 events。地图自动依据坐标布局；当前地图范围为东经 100—131 度、北纬 21—46 度；新城市若超出范围，应同时调整 `assets/journeys.js` 的投影范围、经纬网与海岸线裁切，不能静默落在图外。
- 每条赛事填写 id、title、year（未知留空）、kind、school（未知留空）、summary、photos。有奖项时填写真实 awardId；现场参赛经历使用 participation；result 为 no-award（已确认未获奖）或 unconfirmed（成绩待补充），不能关联获奖记录。未确认成绩不能写成未获奖。杭州决赛的年份、学校待补充，保留参赛与氛围分享定位。
- 每张现场照片先检查人脸、姓名牌、学号、电话、门牌、车票与二维码，避免公开住宿、宿舍和即时行程；去除 EXIF/GPS 后生成 WebP 展示副本。上传前仍需人工检查画面，去元数据并不能隐藏画面本身的位置线索。不要直接复制整批原图进仓库。
- 照片存为 `assets/journeys/城市id-内容简名-SHA256前10位.webp`，将完整 SHA256 写入 `travel-media.mjs`。对应赛事 photos 中填写 image、alt、caption；校验会拒绝未审核照片、额外私人字段或错误奖项关联。无照片时留空数组，无需占位图片。
- 学校邮箱和完整竞赛证书依本人选择公开。若将来想降低关联风险，可改用独立联系邮箱并调整公开副本；网页删除不能保证第三方副本、缓存或 Git 历史中的旧版本消失。

完成后执行 `node --test privacy.test.mjs portfolio.test.mjs journey.test.mjs` 和 `node build.mjs`，核对网页后再提交推送。

- 重复到访同一城市时保留独立事件 id 和相册入口，不能因为年份未知而合并掉真实的次数。当前重庆、郑州各两次，广州一次；日期补充后按对应事件更新。
- 地图密集城市通过引导线连接真实城市中心与可点击标签，标签布局在 `assets/journeys.js` 的 labelOffsets 中维护，避免遮挡邻近城市。


## 旅行地图与视频号

- 在城市 events 中用 kind: travel 增加独立旅行记录；awardId、school 未有信息时留空，未知年份留空，纯旅行不得填写 result。照片按原有审核流程关联，不编造旅行日期、景点或次数。
- 默认旅行地图包含全部到访城市，比赛出行也属于旅行。独立旅行记录和参赛经历共用地图，不需要为每次比赛复制一条旅行记录；参赛次数只统计 award 与 participation。
- 可用 `#/journeys?view=travel&city=beijing` 或 `#/journeys?view=competition&city=xian` 分享对应视图。竞赛视图不显示纯旅行城市，筛选切换会校正当前选中城市。
- 视频号账号在 profile.json 的 socials 中维护 handle；当前为 sphi9JNBWNUfo3i。取得真实分享主页链接后再填 url，此前使用复制账号功能。


## 更新计算机方向与 CCF 研究台

- `data/fields.json` 维护十个主领域的主题、简介和对应教学示例；`demo` 必须关联已实现的模块，不能用空页面充作实验。更新研究主题不代表新增论文或成果。
- `scripts/update-ccf.py` 从原版正式 PDF 提取目录，使用 PyMuPDF，核对原文件 SHA256、60 个区块与总数，拒绝未知文件。原版镜像： https://lib.zjgsu.edu.cn/2026/0414/c1056a221631/page.htm 。更换版次需先核对 CCF 官方说明、更新脚本固定版本及计数，并逐页检查；原 PDF 仅缓存于 .private，不上传到公开仓库。
- 条目 id 使用类别、类型与全名摘要，避免仅因排序或推荐类别变化而错配本地准备笔记。若场所改名或归类变化，仍需显式迁移对应候选记录。
- 日期、录用率、影响因子、费用不在该目录数据中。不要从等级推断这些信息，不要把 DBLP 链接标成当届投稿官网。用户在准备台自行核对并填写官网来源；个人准备日期不能当成已验证截稿日期。
- 候选与准备信息只保存在使用者当前浏览器。CSV 导出候选信息；ICS 导出用户填写的个人准备日期，日历应用负责提醒。若今后需要跨设备同步或自动收集截止日期，应另行设计后端、来源核验和权限。

## 添加朋友

在 `data/friends.json` 数组中添加 `{ "id": "unique-id", "nickname": "昵称", "bio": "一句介绍", "url": "https://主页链接" }`。先确认朋友同意公开这些信息；主页尚无链接可将 url 留空。不要添加电话、邮箱、学号、住址或私有原件字段。名单为空时，网站显示整理中的真实状态。

完整检查：`node --test privacy.test.mjs portfolio.test.mjs journey.test.mjs explore.test.mjs`，然后 `node build.mjs`。浏览器检查各方向交互、CCF 筛选/导出和手机布局后提交推送。
