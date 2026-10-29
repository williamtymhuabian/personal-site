---
title: PickGo Lab摄像头实践：中文TTS播报与D435真实测距
date: 2026-10-29
category: 技术实践
summary: 补全物体检测、GrabCut分割、Windows本地中文TTS和RealSense真实RGB-D点选测距，记录实机验证结果、图像来源与尚未完成的视觉控制闭环。
tags: 计算机视觉, RealSense, TTS, Python, RGB-D
pinned: true
---

PickGo Lab已经接通了常见物体检测、前景分割、中文语音播报和D435真实RGB-D测距。现在可以在页面查看彩色图与配准深度图，点击目标读取光轴深度，也可以让系统用中文播报识别到的类别。

本文于2026-10-29更新，替换原先仅介绍RGB采集与深度开发计划的说明。硬件结果依据项目的10月24日测试记录，相关代码已于10月28日同步到[GitHub仓库](https://github.com/williamtymhuabian/pickgo-lab)。本次整理重新检查了软件测试，没有重新采集相机画面或播放语音。

![本机RealSense D435摄像头与三脚架实拍，摄于早期RGB接入阶段](https://williamtymhuabian.github.io/personal-site/assets/projects/pickgo-d435-device.jpg)

## 一、目前可以做什么

- 原颜色与矩形识别继续保留，用于红、蓝、黄色目标的基础验证。
- NanoDet支持COCO的80类物体候选，GrabCut根据检测框或手动框选提取前景。分割结果不能直接当作精确实例轮廓或抓取点。
- 中文TTS支持试音、播报当前结果、自动播报和停止，Windows使用本地中文语音，不申请麦克风权限。
- D435通过RealSense SDK读取同一组彩色与深度帧，完成配准后支持点选测距，以及检测框中心或有效分割质心的深度读取。
- 来源变化、旧帧和无效深度会使相关结果失效。上述视觉结果尚未闭环控制实体机械臂或底盘。

![最新RGB-D与TTS功能界面说明图：本次未打开摄像头或播放声音，图像和距离为空，仅展示控件与状态，不是实机测距结果图](https://williamtymhuabian.github.io/personal-site/assets/projects/pickgo-rgbd-tts-interface.png)

## 二、先启动本机视觉服务

在仓库根目录安装基础依赖并启动：

~~~bash
python -m pip install -r requirements.txt
python -B app.py --vision-only --port 8771
~~~

这个入口只运行本机视觉服务，不启动运动仿真进程。普通RGB模式可以在Edge或Chrome打开[物体识别页面](http://127.0.0.1:8771/vision.html?source=camera&task=objects)，选好设备后再点击“打开摄像头”。

常见物体检测需要单独准备NanoDet权重：

~~~bash
python -B setup_objects.py --check
python -B setup_objects.py
~~~

第一条只检查本地权重，第二条在需要时下载固定版本并校验。模型约3.8 MB，使用OpenCV DNN CPU推理。手动框选GrabCut和TTS本身不依赖该检测模型。

真实深度需要可选的RealSense运行库。仓库将它放在项目目录，避免修改系统Python：

~~~powershell
python -B -m pip install --no-deps --only-binary=:all: --index-url https://pypi.org/simple --target .runtime/realsense -r requirements-depth.txt
~~~

随后打开[RGB-D页面](http://127.0.0.1:8771/vision.html?source=realsense&task=objects)，或在“图像来源”中选择“RealSense RGB-D / 真实测距”。先关闭其他程序的相机预览，再点击打开，避免设备争用。网页的逐帧识别更新率取决于处理耗时，不能把SDK的30 fps采集配置写成网页实时识别帧率。

## 三、中文TTS怎么播报识别结果

语音部分由[vision_speech.js](https://github.com/williamtymhuabian/pickgo-lab/blob/d796e97/vision_speech.js)组织播报内容和页面状态，[speech_audio.py](https://github.com/williamtymhuabian/pickgo-lab/blob/d796e97/speech_audio.py)在Windows上调用已安装的System.Speech中文语音，将WAV音频交给浏览器播放。

识别后可以点击“播报当前结果”，也可以先点某个候选目标，优先播报这一类别。表述使用“可能识别到杯子”，不会把模型分数解释成正确率。没有目标或类别未知时，系统会说明当前状态；手动框选只说明提取了前景，不猜测物体名称。

自动播报与连续识别配合使用：类别组合需要连续出现两次，两次播报至少间隔6秒，相同内容20秒内不重复。超过2.5秒的旧观测不能触发自动播报。切换来源、关闭相机或隐藏页面会停止旧语音，“停止播报”还会关闭自动播报。

语音在本机合成，不调用云TTS，不下载语音模型，也不采集麦克风。其他系统可以回退到浏览器已有的本地中文语音；没有可用语音时会报告不可用。实现与实测说明见[中文播报记录](https://github.com/williamtymhuabian/pickgo-lab/blob/d796e97/docs/speech.md)。

当前播报内容是物体类别，测距结果另行显示在面板里。距离尚未拼进播报语句，后续可以增加“可能识别到杯子，光轴深度约多少毫米”，同时保留无效与过期状态判断。

## 四、D435测到的究竟是什么距离

RGB-D模式由[realsense_camera.py](https://github.com/williamtymhuabian/pickgo-lab/blob/d796e97/realsense_camera.py)统一持有设备。SDK读取640×480彩色与Z16深度，使用实际深度比例换算毫米，再通过`align(color)`配准到彩色视角。网页显示的320×240图像来自对应的同组数据，避免拿浏览器RGB去索引另一时刻的深度。

点击彩色图、深度图或候选目标可以更改测距点。测量取该点7×7邻域内有效深度的中值，并显示有效样本数和配准帧信息。分割模式在有效掩膜质心取深度，没有有效掩膜时退回框中心。

当前实现会排除零值、非有限数和0.15—10 m范围外的数据。有效样本少于9个，或不足邻域的30%，会返回无效；邻域深度分布过于分散时会判为多表面混合，不输出距离。这些是工程过滤规则，不能保证消除全部背景回波。

显示值是相机光轴方向的Z，不是相机到目标的欧氏直线距离，也不是物体尺寸、完整三维位姿或机械臂坐标。透明、镜面、金属反光和边缘区域都可能缺少有效深度。伪彩图的颜色仅用于显示，黑色表示无效数据，不能读成零距离。

测距请求绑定当前显示的帧号。迟到响应、来源切换和超过2.5秒的帧都不会继续输出有效测距；空闲约10秒后后台释放设备。深度数组短时保留在内存中，不自动保存照片、深度文件或录像。细节见[真实RGB-D测距说明](https://github.com/williamtymhuabian/pickgo-lab/blob/d796e97/docs/realsense-depth.md)。

## 五、已经留下哪些实机验证记录

10月24日的项目记录包含以下结果。这些是当时场景下的连通与功能检查，本次没有重跑硬件实验：

- D435取得了640×480彩色与深度帧，并完成depth-to-color配准。
- 页面一帧中心读数约325 mm，彩色与深度帧时间差约9 ms；点击键盘候选后，测距点为(75, 156)，读数约502 mm，邻域49/49个样本有效。
- 金属保温杯区域出现无效深度或混合深度时，页面明确拒绝输出距离，没有用RGB或预设数字补齐。
- Windows中文语音生成了有效WAV，浏览器完成播放，当时用户确认听到试音和识别结果播报。
- 保温杯识别出现过cup、bottle混淆和漏检，因此不能据一次播报声称已经稳定识别这类物体。

约325 mm或502 mm只是当时观测值，没有用尺具完成精度标定，不能写成测距误差或准确率。对应记录没有导出真实RGB-D截图或录像，因此目前无法补出那次测距的原始画面。

![10月18日D435 RGB橘子近景：真实彩色采集的历史图片，仅用于展示RGB接入，不是10月24日深度测距或物体识别成功的证据](https://williamtymhuabian.github.io/personal-site/assets/projects/pickgo-d435-rgb-real.png)

![早期合成视频流联调截图：验证送检帧、检测框与原算法输出的对应关系，输入并非真实相机画面](https://williamtymhuabian.github.io/personal-site/assets/projects/pickgo-camera-test-stream.png)

## 六、观测评估也已经接入

当前页面还提供同帧框扰动评估：对原框、扩框或缩框等候选提示比较分割结果，显示掩膜一致性、中心差异和共同前景内部像素。它用于发现结果对框选是否敏感，一致性高也可能是大家一起分错，不能当作分割准确率。

![10月23日观测质量界面截图：输入为合成测试／冻结帧，展示框选扰动评估与报告入口，不是真实测距结果或抓取点验证](https://williamtymhuabian.github.io/personal-site/assets/projects/pickgo-observation-quality.png)

实时RGB观测需要积累不同的新帧，冻结图不能重复计作连续证据。修改来源、参数或所选目标后，原有评估会失效。原始流程与限制见[摄像头实操说明](https://github.com/williamtymhuabian/pickgo-lab/blob/d796e97/docs/camera-validation-2026-10-24.md)。

## 七、软件测试与后续工作

10月28日的[发布记录](https://github.com/williamtymhuabian/pickgo-lab/blob/d796e97/CHANGELOG.md)记载66项Python回归及全部JavaScript测试通过。本次整理单独重跑了测距、语音的13项Python测试和14项前端测试，均通过；测试使用假相机、数组和模拟音频，不能替代实机测量。

~~~bash
python -B -m unittest discover -s tests -p test_realsense.py
python -B -m unittest discover -s tests -p test_speech.py
node --test tests/depth_client.test.cjs tests/speech.test.cjs
~~~

接下来需要补的是不同距离与材质下的测距误差记录、有效像素反投影、相机到机器人基座的外参，以及带失败处理的任务闭环。识别类别、能播报、能读取Z值，距离真正可靠地控制抓取还有这些步骤。

源码与完整用法：[PickGo Lab](https://github.com/williamtymhuabian/pickgo-lab)。
