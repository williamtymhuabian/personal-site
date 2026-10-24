# AI Agent 十章共读：离线练习

这些是博客独立编写的教学程序，用来观察局部机制，不是原书代码复现或真实模型性能测试。依赖 Python 3.10 或以上和标准库，不需要安装第三方包、API Key 或 GPU。程序使用构造数据，不访问网络或外部账户，也不执行真实机器人动作。

在这个目录中分别运行：

```bash
python agent_loop.py
python context_pack.py
python memory_retrieval.py
python tool_contract.py
python patch_verification.py
python evaluation_rubric.py
python training_objectives.py
python evolution_gate.py
python realtime_epochs.py
python handoff_contract.py
```

文件依次对应第1—10章：[十章共读索引](https://williamtymhuabian.github.io/personal-site/#/books?book=ai-agents-in-depth)。每篇文章都保留完整源码、实际运行输出和代码导读。

学习时先运行原程序，保留输入与输出；再按照文章修改一项条件，先预测结果，最后比较实际变化。没有通过断言或出现异常时，先确认它是预期的拒绝路径，还是实现中尚未处理的错误。

- 第1—3章：观察反馈、上下文打包和可见性过滤。
- 第4—6章：检查重复请求、候选补丁与评分规则。
- 第7—8章：手算训练目标，比较候选接纳和回滚条件。
- 第9—10章：跟踪任务版本、迟到事件与移交冲突。

`memory_retrieval.py` 的查询日期固定为2026-10-23，以便重复运行得到同一结果；它不是当前日期查询。各章中标为“进阶”“拓展”的修改需要读者自行实现，原始文件只提供基础机制。

完成一次练习后，建议记录：改动了什么、为什么这样预测、实际结果是什么、解释中还有哪些未验证的假设。可以将记录关联到博客相应章节和研究方向。
