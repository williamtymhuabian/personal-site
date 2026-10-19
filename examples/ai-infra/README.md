# 大模型推理对照实验

代码已准备，GPU 实验尚未执行。本地检查只覆盖 Python 语法、命令生成、流式解析和结果导出。依赖安装、显存适配、模型正确性与性能数据，均需要在实际服务器验证。

实验按 HF → Nano-vLLM → Mini-SGLang 执行；可以分多次完成。服务器以 Linux、Python 3.11、单张可见 NVIDIA GPU 为起点，不假设具体显卡型号。使用管理员或作业系统分配的 GPU，保留已有的 `CUDA_VISIBLE_DEVICES`。不需要提供服务器地址、账号、密码或密钥。

## 文件怎么用

- `EXPERIMENTS.md`：实验问题、固定条件、矩阵、计时范围与结果判断。
- `SETUP.md`：隔离环境、固定模型与引擎版本、安装步骤和报错处理。
- `scripts/hf_cache_lab.py`：完整重算、手写 KV Cache 与 HF generate 输出核对。
- `scripts/nano_bench.py`：固定输入输出长度的单卡离线批请求测量。
- `scripts/run_matrix.py`：顺序执行参数组合，默认只预览，失败即停止。
- `scripts/mini_requests.py`、`mini_client.py`：生成同 token 长度的共享/不同前缀请求，记录 HTTP 流式延迟。
- `scripts/collect_results.py`：检查结果，按字段白名单导出可回传的数据包。

## 上传以后先做什么

在服务器解压，进入 `ai-infra-lab` 目录。先按 [SETUP.md](SETUP.md) 建立 HF 环境、安装匹配驱动的 CUDA 版 PyTorch，并下载固定版本的模型。然后在同一终端执行：

```bash
source .venv-hf/bin/activate
python scripts/check_env.py --output results/raw/environment-hf.json
python scripts/run_matrix.py --suite hf --model models/Qwen3-0.6B --smoke --output results/raw/hf-smoke
```

最后一条只显示命令，不加载模型。确认环境检查通过后，真正运行：

```bash
python scripts/run_matrix.py --suite hf --model models/Qwen3-0.6B --smoke --output results/raw/hf-smoke --execute
```

这一步通过后，跑正式 HF 矩阵：

```bash
python scripts/run_matrix.py --suite hf --model models/Qwen3-0.6B --output results/raw/hf-full --execute
```

每个目录只写一次。失败后保留原目录排错，重跑时换成 `hf-smoke-02` 等新目录，不会覆盖旧结果。

## 后续两组实验

Nano 和 Mini 的环境分别按 SETUP.md 安装，不能直接在 HF 环境里叠加安装。各组完整命令在 EXPERIMENTS.md。先通过最小输入，再扩大请求数量，不要一次启动多个 GPU 实验进程。

所有实验完成后，在任意 Python 3.11 环境导出：

```bash
python scripts/collect_results.py --input results/raw --output results/share-01
```

检查 `results/share-01/metrics.json`，把同目录的 `results-to-share.zip` 回传即可。导出包不包含原始日志、用户名、服务器地址、模型目录、环境转储、请求文本、生成文本和 token ID。原始文件留在服务器，暂不公开。如有错误，先提供哪一步失败和去除路径、账号等信息后的报错片段。

## 不依赖模型的工具检查

```bash
python -B -m unittest discover -s tests -v
```

这些测试使用人工构造的解析样本，不代表 GPU 实验结果。代码基于原有学习材料中的生成循环和离线基准脚本整理，并补充了矩阵执行、服务端客户端与结果回传工具。第三方引擎保留在各自仓库，许可证以原项目为准。
