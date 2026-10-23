"""Chapter 8: controlled release gate with manually constructed test outcomes."""
from dataclasses import dataclass


@dataclass(frozen=True)
class Report:
    version: str
    new_tasks: tuple
    retained_tasks: tuple
    safety: tuple


def promote(baseline, candidate):
    for name in ("new_tasks", "retained_tasks", "safety"):
        old, new = getattr(baseline, name), getattr(candidate, name)
        if not old or len(old) != len(new):
            raise ValueError("同一评估维度必须有一一对应的用例")
        if any(type(v) is not bool for v in old + new):
            raise ValueError("练习中的用例结果必须为布尔值")
    if not all(candidate.safety):
        return False, "安全门槛未通过"
    if any(old and not new for old, new in
           zip(baseline.retained_tasks, candidate.retained_tasks)):
        return False, "旧能力发生回退"
    if sum(candidate.new_tasks) <= sum(baseline.new_tasks):
        return False, "新任务没有增加通过数"
    return True, "允许进入下一阶段验证"


if __name__ == "__main__":
    baseline = Report("v1", (False, True), (True, True), (True,))
    regression = Report("v2-bad", (True, True), (False, True), (True,))
    candidate = Report("v2", (True, True), (True, True), (True,))
    current = baseline
    for proposal in (regression, candidate):
        allowed, reason = promote(baseline, proposal)
        print(proposal.version, allowed, reason)
        if allowed:
            current = proposal
    print("练习中的当前版本：", current.version)
    current = baseline  # Explicit rollback in this in-memory teaching example.
    print("回滚后：", current.version)
