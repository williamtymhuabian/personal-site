---
title: Paper2Podium：把论文整理成科研汇报与竞赛路演
date: 2026-10-26
category: 技术实践
summary: 整理科研汇报与竞赛路演两套Agent技能，用TravelUAV展示不同的讲述方式，并记录图表提取、讲稿备注和逐页核对的使用流程。
tags: Paper2Podium, Agent Skill, 科研汇报, 竞赛路演, Python, PPT
pinned: true
---

做组会汇报时，我需要讲清楚论文解决了什么问题、方法为什么成立、实验说明了什么。准备竞赛答辩时，评委还会关心项目给谁用、完成到了哪一步，以及团队接下来怎么做。同一份技术材料，讲述顺序和页面重点往往要重新安排。

我把这两种需求整理到了[Paper2Podium](https://github.com/williamtymhuabian/paper2podium)里。它包含`research-ppt`和`competition-ppt`两套Agent技能，配有图表提取脚本、设计说明和可修改的示例构建代码。

![Paper2Podium同一篇论文的两种呈现：左侧为科研汇报，右侧为竞赛路演。示例中的论文、技术图和研究成果属于TravelUAV原作者，仅用于演示排版与讲述方式](https://williamtymhuabian.github.io/personal-site/assets/projects/paper2podium-two-stages.jpg)

## 一、先看已有的示例

仓库选用TravelUAV作为共同材料，论文全名为[Towards Realistic UAV Vision-Language Navigation: Platform, Benchmark, and Methodology](https://arxiv.org/abs/2410.07087)。这篇论文研究无人机视觉语言导航，介绍了OpenUAV平台、任务基准和导航方法。论文作者为Xiangyu Wang等人，原项目主页是[OpenUAV](https://prince687028.github.io/OpenUAV/)。

目前仓库提供两份中文成品：科研版14页，竞赛版17页，两份PPT每页都有演讲者备注。可以先看[成品目录中的PDF与PPTX](https://github.com/williamtymhuabian/paper2podium/tree/main/showcase/decks)，再决定是否使用对应技能。英文版有配套构建脚本，不能把它和已提交的中文成品混为一谈。

这些样例用于比较表达方式。TravelUAV的研究、实验和平台均应署名给原作者，不代表我完成了这项研究，也不代表样例参加过竞赛或获得过奖项。

## 二、科研汇报怎么组织

科研版从研究问题开始，依次交代已有工作的不足、方法设计、实验结果和局限。页面以白底和蓝灰色为主，把空间留给框架图、对照实验和关键结论。

`research-ppt`采用“一页一个判断，再用证据解释”的写法。例如，方法页可以先说明模块承担的作用，再展示结构图；实验页应写清比较对象、评价指标和实验设置，不能只留下一个醒目的提升百分比。

我希望这套技能能减少整理材料和重复排版的时间。论文里的假设、指标含义以及结论适用范围，仍然需要汇报者自己读懂。

![TravelUAV科研版14页概览，展示背景、平台、数据集、方法与实验的编排。论文图表来源为TravelUAV原作者，完整内容可在仓库成品目录查看](https://williamtymhuabian.github.io/personal-site/assets/projects/paper2podium-research-overview.jpg)

## 三、竞赛路演要补哪些材料

`competition-ppt`把讲述重点放在应用场景和项目进展上。技术方案仍然需要证据，此外还要解释使用者遇到了什么问题、现有方案有什么不足，以及团队已经完成了哪些工作。创业类项目可以继续讨论市场和收入模式，学术类赛事则应按实际评审要求调整篇幅。

视觉上，示例采用深蓝色背景和章节导航，用较大的数字突出关键结果。颜色和版式可以复用，项目事实要重新填写。

这里有一处需要特别说明：当前竞赛样例包含市场预测、专利或软著申报、团队分工和商业规划等内容。这些表述在本次整理中没有逐项核实，不能直接用作真实参赛申报材料。实际使用时，应换成有来源的数据和已经具备的证明；没有的材料就删去或明确标为计划。

例如，只有论文和代码时，可以介绍方法、复现情况和拟验证的场景。合同、客户数量、专利受理状态等，都要等真实材料齐备后再写入。

## 四、技能文件与脚本各自做什么

仓库的主要结构如下：

~~~text
paper2podium/
  skills/
    research-ppt/
      SKILL.md
      references/
      scripts/extract_figures.py
    competition-ppt/
      SKILL.md
      references/
      scripts/extract_figures.py
      scripts/make_backgrounds.py
  examples/TravelUAV/
  showcase/decks/
~~~

`SKILL.md`描述适用场景和工作步骤，`references`保存配色、字号和页面组织规则，脚本负责提取素材、生成背景等具体操作。Agent读取这些文件后，再结合用户的论文和要求编写或修改PPT构建代码。

需要区分两层工具：技能说明中使用了PptxGenJS的构建约定，当前TravelUAV示例实际采用`python-pptx`。运行示例时，应按示例代码和说明安装Python依赖；使用Agent重新制作时，则要确认它选择的构建工具。安装技能本身不会自动补齐全部运行环境。

## 五、图表提取后为什么还要检查

科研PPT经常需要从PDF里取出方法图或实验曲线。仓库的提取脚本会寻找Figure、Fig、Table等图注，结合栏宽、位图位置和矢量绘图范围估计裁剪区域，再输出PNG和包含页码、图注、置信度等信息的`manifest.json`。

这种方法能减少手工截图，但双栏论文、多面板图和扫描件仍可能裁错。遇到缺少子图、混入正文或图注被截断的情况，要先看整页，再按PDF坐标重新裁剪。

在仓库根目录准备好自己的`paper.pdf`后，可以使用：

~~~bash
python -m pip install PyMuPDF python-pptx pillow
python skills/research-ppt/scripts/extract_figures.py paper.pdf -o figures --dpi 450
~~~

如果第3页提取不完整，先输出整页预览：

~~~bash
python skills/research-ppt/scripts/extract_figures.py paper.pdf -o figures --render-page 3
~~~

然后根据实际版面指定区域。下面的坐标仅用于展示参数格式，不能套用于所有论文：

~~~bash
python skills/research-ppt/scripts/extract_figures.py paper.pdf -o figures --crop 3,72,220,540,560
~~~

提高输出DPI可以改善矢量图的渲染清晰度，原本模糊的位图则不会因此增加细节。

## 六、怎样用在自己的汇报里

先获取仓库：

~~~bash
git clone https://github.com/williamtymhuabian/paper2podium.git
cd paper2podium
~~~

把需要的技能文件夹完整放进所用Agent支持的技能目录，保留`SKILL.md`、`references`和`scripts`的相对结构。不同客户端的目录和加载方式可能不同，仓库README中的ZCode路径只是其中一种示例。也可以直接让支持本地文件读取的Agent参考对应技能文件。

做科研汇报时，我会给出这样的任务：

> 请参考research-ppt技能，把这篇论文整理为15分钟组会汇报。先给出逐页大纲，每页写清要解释的问题和所需证据；确认后再制作PPT。图表注明论文页码或图号，讲稿放到演讲者备注中。材料缺失时列出缺项。

做竞赛路演时，输入需要更具体：

> 请参考competition-ppt技能，制作8分钟项目路演。已有材料包括项目说明、实物照片和测试记录。先按本届赛事要求安排内容，区分已完成工作和后续计划。缺少市场、财务或知识产权证明时，不补造数据。

想复现仓库中的TravelUAV示例，可以按[示例说明](https://github.com/williamtymhuabian/paper2podium/tree/main/examples/TravelUAV)准备论文PDF和原项目图片，再执行构建及讲稿注入脚本。部分源素材没有入库，直接运行构建脚本可能找不到图片。

## 七、交付前还要做一次完整演练

生成PPT之后，我会先检查每页论断是否有依据，尤其核对百分比的分母、对照方法和实验条件。接着看图片有没有缺失子图、文字有没有溢出，以及换到演示电脑后字体和符号是否正常。

仓库的技能文档还要求把PPT转为PDF或逐页图片做视觉检查，这一步通常需要LibreOffice和Poppler等工具。最后按实际时长讲一遍，把讲不完的细节移到备注或备份页。

Paper2Podium目前已经有两套技能、素材脚本和公开示例。接下来更值得补的是可追溯的证据清单：让重要数字对应到论文图表或测试记录，让待补材料留在检查清单里，方便汇报者在上台前逐项确认。

代码仓库采用MIT许可证。论文图片、学校标识等第三方素材仍按各自的权利和使用条件处理，引用时保留原始出处。

项目地址：[Paper2Podium](https://github.com/williamtymhuabian/paper2podium)。
