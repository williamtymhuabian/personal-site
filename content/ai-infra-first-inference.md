---
title: 从生成循环到推理服务：三组 AI Infra 对照实验
date: 2026-10-19
category: 技术实践
summary: 写好逐 token 生成、KV Cache 对照、Nano-vLLM 批请求测量与 Mini-SGLang 客户端，把参数、计时和结果检查放进同一套实验工程。
tags: AI Infra, 大模型推理, KV Cache, CUDA Graph, 实验设计
pinned: true
---

看推理引擎源码时，我想先弄清三个问题：缓存省掉了什么计算，多条请求怎样影响吞吐，以及请求变成服务以后，用户实际等了多久。

围绕这些问题，我整理了一套可以上传到 Linux GPU 服务器运行的代码。生成循环、参数矩阵、流式请求和结果导出已经写好，GPU 测量还没有开始。这篇先记录实现与实验方法，测量结果等服务器跑完后补上。

[实验代码与运行说明](https://github.com/williamtymhuabian/personal-site/tree/main/examples/ai-infra)、[完整实验设计](https://github.com/williamtymhuabian/personal-site/blob/main/examples/ai-infra/EXPERIMENTS.md)都放在仓库里。工程不包含权重、服务器配置和原始日志。

## 先把生成循环写出来

模型选用 [Qwen3-0.6B](https://huggingface.co/Qwen/Qwen3-0.6B)，固定模型 revision。三个环境分别用于 Transformers、Nano-vLLM 和 Mini-SGLang，避免依赖混在一起。

第一段代码只处理一条没有 padding 的输入。每次读取最后一个位置的 logits，选择分数最大的 token，接到已有序列后面。为了核对实现，暂时固定生成长度，忽略 EOS。

`hf_cache_lab.py` 中保留了两条路径：完整重算时，每一步送入全部历史；使用缓存时，第一次送完整输入，后续只送上一步的新 token。历史 KV 通过 `past_key_values` 保留，attention mask 仍覆盖完整上下文。

用输入长度 4、生成长度 3 举例，前向输入长度应该是：

~~~text
完整重算：4 → 5 → 6
使用缓存：4 → 1 → 1
~~~

这是检查程序用的小例子，不是测量结果。最后一个生成 token 没有再送回模型，最后一次前向对应的历史总长是 6。

缓存保存各层历史位置的 Key 和 Value，新位置的 Query 仍需要访问历史 KV。因此，后续只输入一个 token，不等于注意力只计算一个位置。可以对照 [Transformers 的缓存说明](https://huggingface.co/docs/transformers/en/cache_explanation)理解这部分。

每个组合先检查两条路径逐 token 是否一致，再与 HF generate 核对。脚本保存 token ID 和前向输入长度；出现不同就返回失败，让矩阵停止。先找出第一次不同的位置，再查掩码、位置编码和精度问题。

## 第一组：比较有缓存与无缓存

正式矩阵使用 64、256、1024 三种输入长度，分别生成 16 或 64 个 token，一共六个组合。输入采用固定种子的合成 token 序列，保证长度准确；正常文本生成另有单独入口，不和固定工作量测量混用。

每个组合预热两次，测量五次，交替改变两条路径的先后顺序。计时前后同步 GPU，保留每轮耗时和 PyTorch allocated 显存峰值。这里计入模型执行和 Python 生成循环，排除模型加载、分词和文本解码。

准备环境与本地权重后，先预览命令：

~~~bash
python scripts/run_matrix.py --suite hf --model models/Qwen3-0.6B --output results/raw/hf-full
~~~

确认参数后追加 `--execute` 才运行。第一次建议同时加 `--smoke`，先用短输入检查安装和正确性。最小运行只有一次测量，不用于性能结论。

结果看同一组合的无缓存/缓存中位耗时比值，再看输入、输出变长时是否有稳定趋势。不先填一个预期加速倍数，也不把显存峰值当成整个进程的显存占用。

## 第二组：批请求与 CUDA Graph

[Nano-vLLM](https://github.com/GeeeekExplorer/nano-vllm)这一组比较 eager 和 CUDA Graph 两种模式。输入长度取 128、512，提交请求数取 1、4、8，每条固定生成 64 个 token，共十二个组合。

`nano_bench.py` 在引擎预热后测量整批 `generate()` 的完成时间。它包括主机调度与输出解码，排除引擎构造和图捕获。采样温度、随机种子和输出长度固定，检查实际输出总数是否等于请求数乘以 64。

每轮输入使用不同种子，对应 eager/graph 使用相同输入，并记录 hash。这样能核对两侧工作量，也减少反复测同一条输入带来的前缀复用干扰。每个组合单独启动进程，运行顺序交替。

~~~bash
python scripts/run_matrix.py --suite nano --model models/Qwen3-0.6B --output results/raw/nano-full --execute
~~~

这里“提交八条请求”不代表每一步都同时执行八条，请求还受调度预算和缓存容量限制。记录的是整批吞吐量，不能据此推算每条请求的首 token 延迟。

HF 和 Nano 的计时范围也不同，所以这两组数据各自做内部对照，不拿来计算跨引擎加速倍数。结果导出工具会检查参数、依赖、提交号和每轮输入 hash，再配对 eager/graph 的正式数据。

## 第三组：把请求送进服务端

服务端使用 Mini-SGLang。固定提交的实现提供 naive 和 radix 两种前缀缓存策略，可以让同一组请求分别在两种模式下运行。请求、分词、调度和执行的分工可对照[项目结构说明](https://github.com/sgl-project/mini-sglang/blob/main/docs/structures.md)。

`mini_requests.py` 生成共享前缀与不同前缀两类请求，每一对经过 tokenizer 后的长度相同。文件记录输入 token hash，以及与之前请求的最长共同 token 数。两类请求交替发送，所有对照使用同一份文件。

服务只监听服务器本机的 `127.0.0.1`。客户端也在服务器上执行，顺序发送请求，先用无关输入预热。切换缓存策略时完整重启服务，做三轮成对测试，并改变两种模式的先后顺序。

每类第一次出现的输入单独看，后续请求再比较。相同 workload hash 下按请求编号配对，观察首段文本延迟与总耗时在不同轮次是否一致变化。最长共同前缀只说明输入之间的关系，不能直接写成服务端命中了多少 token。

核对[接口实现](https://github.com/sgl-project/mini-sglang/blob/9a91cfafe754aa85daee49998176275667eb58f2/python/minisgl/server/api_server.py)时，有两个细节需要避开：非流式 usage 中的 token 数是占位值；流式文本块也不保证一个块对应一个 token。因此客户端记录的是首段非空文本到达的时间和请求总耗时，不从数据块数量推算 tokens/s 或逐 token 间隔。

前缀缓存是否改善延迟，要看开关对照与多轮结果。如果接着研究具体命中长度，需要在缓存匹配调用处加入统计，再单独跑诊断轮；正式计时关闭日志，避免把日志开销算进去。

## 结果怎样留下来

原始结果留在服务器。矩阵执行器不会覆盖已有目录，某个组合失败就停下来，保留对应日志。模型、环境、第三方源码和结果目录也不会进入 Git。

完成后运行：

~~~bash
python scripts/collect_results.py --input results/raw --output results/share-01
~~~

导出器保留参数、逐轮测量、配置与代码指纹，排除原始日志、路径、环境转储、请求文本、生成文本和 token ID。检查导出的 JSON 后，再用它画图和整理公开记录。

现在完成的是实验工程和不加载模型的工具检查。GPU 是否兼容、缓存路径是否通过模型核对、各组实际耗时是多少，都等服务器运行后确认。接下来先把这三组数据收齐，再决定继续查缓存访问、调度等待，还是服务端前缀复用。
