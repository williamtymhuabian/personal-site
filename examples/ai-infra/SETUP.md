# 服务器准备

以下命令由你在分配到 GPU 的 Linux 服务器上执行。本项目没有在本机安装这些环境，也没有验证特定驱动与 CUDA 组合。

## 1. 检查 Python 和驱动

```bash
python3.11 --version
nvidia-smi
```

没有 Python 3.11 时，使用已有的 Conda/模块系统创建环境，或请管理员提供；不要修改系统 Python、GPU 驱动或共享环境。不要把完整 `nvidia-smi` 截图、登录信息、SSH 配置发到公开博客。

## 2. HF 环境

在本项目根目录执行：

```bash
python3.11 -m venv .venv-hf
source .venv-hf/bin/activate
python -m pip install --upgrade pip
```

到 [PyTorch 安装页](https://pytorch.org/get-started/locally/)选择适合服务器驱动的 CUDA wheel，然后在当前隔离环境执行它给出的安装命令。不要照抄其他机器的 CUDA 版本。建议三个环境采用同一可兼容的 PyTorch 版本；Mini 当前声明 `torch<2.10`，Nano 声明 `torch>=2.4`，实际还受 FlashAttention/FlashInfer 构建影响。依赖范围不是已经验证的安装锁文件。

```bash
python -m pip install 'transformers==4.57.3' 'huggingface-hub>=0.34,<1'
mkdir -p models results/raw
hf download Qwen/Qwen3-0.6B --revision c1899de289a04d12100db370d81485cdf75e47ca --local-dir models/Qwen3-0.6B
python scripts/check_env.py --output results/raw/environment-hf.json
python -m pip freeze > results/raw/hf-packages.private.txt
```

确认报告中的 `cuda_available` 为 true，检查命令才返回 0。模型推理使用本地权重；不接受 `trust_remote_code`，不自动执行模型仓库代码。脚本记录模型配置与 tokenizer 哈希；权重版本依赖上述固定 revision 的下载，不等于脚本逐个校验了权重文件。

## 3. Nano-vLLM 环境

结束 HF 组实验后再安装。使用单独终端，或先执行 `deactivate`。

```bash
python3.11 -m venv .venv-nano
source .venv-nano/bin/activate
python -m pip install --upgrade pip
```

先按上面的方式安装与驱动相符的 PyTorch，再执行：

```bash
mkdir -p third_party
git clone https://github.com/GeeeekExplorer/nano-vllm.git third_party/nano-vllm
git -C third_party/nano-vllm checkout bb823b3e06983d71485a8e1f23715ebd87d98ef8
python -m pip install packaging ninja wheel
python -m pip install -e third_party/nano-vllm
python scripts/check_env.py --output results/raw/environment-nano.json
python -m pip freeze > results/raw/nano-packages.private.txt
git -C third_party/nano-vllm rev-parse HEAD
```

若 FlashAttention 编译失败，先核对 CUDA toolkit、编译器、PyTorch ABI 和显卡支持；不要为了绕过报错直接升级共享驱动。可以先完成 HF 组，把安装错误去除个人路径后反馈。依赖解析可能更改本环境的 torch，因此以安装完成后的报告为准。

## 4. Mini-SGLang 环境

```bash
python3.11 -m venv .venv-mini
source .venv-mini/bin/activate
python -m pip install --upgrade pip
```

先在当前环境安装兼容的 CUDA PyTorch，再执行：

```bash
git clone https://github.com/sgl-project/mini-sglang.git third_party/mini-sglang
git -C third_party/mini-sglang checkout 9a91cfafe754aa85daee49998176275667eb58f2
python -m pip install -e third_party/mini-sglang
python scripts/check_env.py --output results/raw/environment-mini.json
python -m pip freeze > results/raw/mini-packages.private.txt
python -m minisgl --help
```

准备日期是 2026-10-19。版本记录见 `versions.json`；不要用日后更新的 main 分支替换固定提交后，继续沿用同一组实验结论。Mini 的 `fi` 注意力后端依赖 FlashInfer，需要服务器平台实际支持。

## 常见中断

- 无 CUDA：确认当前作业已分配 GPU、激活了正确环境、安装的是 CUDA 版 torch。
- 不支持 bfloat16：HF 命令补 `--dtype float16`，整组统一，不混用两种精度的测量。
- 显存不足：停止当前实验，确认没有自己的残留进程；换小输入或小批量先排错。调整内存比例后整组重跑，不能只改对照中的一侧。不要终止别人的进程。
- 安装依赖冲突：保留错误，在新隔离环境调整，记录变更；不要使用强制忽略依赖来制造“安装成功”。

模型、环境、第三方源码、原始结果均已加入本目录的 `.gitignore`。ZIP 只分发实验源码与说明，不携带模型权重和本机环境。
