# 实验记录与运行顺序

本文件规定实验方法，没有填写测量值。三个问题分别是：缓存是否减少重复计算；批请求与 CUDA Graph 怎样影响离线吞吐；共享前缀在服务端是否带来可重复的延迟变化。

## 共同条件

使用 `versions.json` 中的模型 revision 与引擎提交，单张 GPU，串行运行不同实验。记录依赖版本、GPU 型号、代码及模型配置哈希，保留原始数据。服务器应处于分配给你的独占时段；若有其他任务竞争，记录干扰并重测。

正式实验每个组合预热 2 次、测量 5 次；最小运行只有 1 次，用于排查兼容性，不能形成性能结论。每轮保留原始时间，报告中位数，同时查看最小值、最大值和异常轮次。完整矩阵建议换新目录重复 3 遍，轮次间保留固定参数，避免把温度、频率或并发干扰当作优化收益。

报告中说明加载、编译、分词、解码是否包含在计时内。PyTorch 的 allocated/reserved 显存不等于整个进程的设备显存，尤其不能完整反映 CUDA Graph 私有池与第三方分配。

## A. 手写生成与 KV Cache

问题：在相同输入和相同贪心选择下，两条生成路径是否输出相同 token？序列变长后，耗时怎样变化？

`hf_cache_lab.py` 已实现两条路径。无缓存时，每步输入全部历史；有缓存时，第一次输入完整上下文，后续输入一个 token，掩码覆盖历史和当前位置。固定生成 N 个 token，忽略 EOS，避免提前停止造成任务量不同。

输入长度 L=4、生成 N=3 时，前向长度应为：

```text
无缓存：[4, 5, 6]
有缓存：[4, 1, 1]
```

最后一个新 token 不再送回模型，因此最后一次前向对应的历史总长是 L+N−1。

先在 HF 环境执行 README 中的最小运行。正式组合为 L∈{64,256,1024}、N∈{16,64}，共 6 组。输入为固定种子生成的合成 token 序列，长度准确；它衡量固定计算工作量，不评价回答质量。另有自然文本 `--task baseline` 用于观察正常输出。

```bash
source .venv-hf/bin/activate
python scripts/run_matrix.py --suite hf --model models/Qwen3-0.6B --output results/raw/hf-full --execute
```

每个组合交替先跑有缓存或无缓存，核对每轮两条路径，并把最后一轮缓存输出与 HF generate 核对。任一 token 不同，脚本保存原始 token 和前向长度后返回失败，矩阵停止；先查首次不同的位置、mask、位置编码和精度，不据此发布加速结论。

计时范围是模型执行与 Python 生成循环，排除加载、分词、文本解码；包含同步，计时前重置显存峰值。比较同一组中位耗时的无缓存/缓存比值。不要预设一定加速多少，也不要把合成 token 的输出解释成语言能力。

## B. Nano-vLLM 批请求和 CUDA Graph

问题：固定输入输出长度时，提交更多请求和开启 CUDA Graph 是否改变整批完成时间？

```bash
source .venv-nano/bin/activate
python scripts/run_matrix.py --suite nano --model models/Qwen3-0.6B --smoke --output results/raw/nano-smoke --execute
python scripts/run_matrix.py --suite nano --model models/Qwen3-0.6B --output results/raw/nano-full --execute
```

正式参数是输入长度 {128,512}、提交请求数 {1,4,8}、模式 {eager,graph}，共 12 个组合；每条固定输出 64 token。上下文上限 2048，调度 token 预算 2048，内存比例 0.5。提交 8 条请求不保证同一计算步都同时执行，实际批次由调度器和预算决定。

模式在每个组合上交替执行顺序；每个组合启动独立进程。对应 eager/graph 使用相同的每轮输入 hash，warmup 和正式轮使用不同的随机输入，减少重复前缀缓存对该组的干扰。采样温度固定为 0.6、种子固定、忽略 EOS；验证实际输出总数等于请求数×64，但不把跨模式采样文本一致作为正确性保证。

计时范围是预热后的 `engine.generate()` 整批完成时间，包含主机调度与输出解码，不含引擎构造、图捕获和输入构造。输出吞吐量是整批输出 token 数除以这段时间；这里没有逐请求 TTFT 或 P99。

结果导出器只在 GPU、依赖、源码提交、参数和每轮输入 hash 一致时计算 eager/graph 比值。最小运行不会生成该性能比值。HF 和 Nano 计时范围不同，不用它们的数字计算跨引擎“加速倍数”。这组也不是 Nano 与完整 vLLM 的对比。

## C. Mini-SGLang 请求和前缀缓存

问题：相同请求集合，切换跨请求前缀缓存策略，延迟变化是否稳定？同一前缀重复出现与不同前缀的变化是否不同？

先在 HF 环境生成请求文件，只用 tokenizer，不加载模型：

```bash
source .venv-hf/bin/activate
python scripts/mini_requests.py --model models/Qwen3-0.6B --output results/mini-workload.json
```

文件包含 12 条共享前缀请求、12 条不同前缀请求，交替发送。每一对的实际 token 数相同，记录 token hash 和与本组之前请求的最长共同 token 数。使用纯文本 prompt，绕开聊天模板的额外处理；这组不评价对话效果。该文件在所有对照中保持不变。

启动服务器前，先确认上一组进程退出。在终端 1 激活 Mini 环境，第一遍设置 naive，其他参数保持一致：

```bash
source .venv-mini/bin/activate
python -m minisgl --model "$PWD/models/Qwen3-0.6B" \
  --tensor-parallel-size 1 --dtype float16 --attention-backend fi \
  --page-size 1 --memory-ratio 0.5 --max-running-requests 8 \
  --max-seq-len-override 2048 --cuda-graph-max-bs 8 \
  --cache-type naive --host 127.0.0.1 --port 1919
```

等待启动完成后，在同一服务器的终端 2、项目根目录执行：

```bash
source .venv-mini/bin/activate
python scripts/check_env.py --output results/raw/environment-mini-round1-naive.json
python scripts/mini_client.py --workload results/mini-workload.json \
  --cache-mode naive --server-commit "$(git -C third_party/mini-sglang rev-parse HEAD)" \
  --output results/raw/mini-round1-naive.json
```

客户端串行发请求，先用独立的无关 prompt 预热 2 次。只连接本机回环地址，不开放公网端口。`--cache-mode` 是你对启动参数的记录，客户端无法通过 HTTP 自动证明服务端实际用了哪种缓存策略。

完成后在终端 1 按 Ctrl+C，确认服务退出，使用相同启动命令，把 `--cache-type naive` 改为 `--cache-type radix`。终端 2 把客户端的 `--cache-mode` 改为 radix、输出文件改为 `mini-round1-radix.json`。不要只切客户端标签而忘记重启服务端。

如此做 3 轮独立重启的成对实验：round1 按 naive→radix，round2 按 radix→naive，round3 按 naive→radix，使用新的结果文件名。每次重启后只运行一遍客户端，避免上次请求残留缓存。

分析时分别看 shared/distinct，剔除每组 index=0 的首次输入，把它单独展示，避免将通用预热后的首次前缀请求称为“服务冷启动”。同一 workload hash 下按 group/index 配对，比较每轮的中位首段延迟与请求总耗时，再看三轮是否方向一致。样本少，不报告 P99。

客户端记录的是从 HTTP 发送到首段非空文本到达的时间，以及到 `[DONE]` 的总时间。SSE 的一个文本块可能包含多个 token；当前上游非流式 usage 也不提供可信 token 计数。因此这里不计算精确 TTFT、TPOT 或 token 吞吐量。输入 token 统计来自本地 tokenizer，最长共同前缀也不等于服务端实际缓存命中数。

naive/radix 的开关对照可以帮助判断跨请求复用的影响。若要进一步写“命中了多少 token”，下一步在固定提交中给缓存匹配调用增加只统计长度的日志，同时核对缓存淘汰情况；需要另跑诊断轮，正式计时关闭日志。当前工具没有伪造这项观测。

## 出错以后保留什么

- 模型输出不一致：保留失败 JSON，定位第一个不同 token，记录精度和注意力后端。
- OOM：保留配置与自己的日志，降低批量或输入长度做兼容性检查；正式对照统一新参数并全部重跑。
- 请求中断：客户端将结果标为 incomplete，结果导出器拒绝将其作为完整数据。
- 依赖变更：保存新的 freeze、源码提交与环境报告，用新结果目录开始，不覆盖旧实验。

## 把结果交回来

```bash
python scripts/collect_results.py --input results/raw --output results/share-01
```

先查看导出的 JSON，再回传 `results-to-share.zip`。数据包保留每轮测量、配置、token hash 和代码指纹；排除路径、日志、环境转储、文本与 token 原始序列。人工备注只写显卡型号、是否独占、有无报错、做过哪些参数改动，实验室名称和机器编号无需提供。

数据到齐后，再补耗时图、显存变化与结论。若数据不支持预期，文章照实写。之后可以把问题缩小到长输入下的缓存开销、批量增大后的调度等待，或固定前缀长度下缓存复用的收益，分别追加一组单变量实验。
