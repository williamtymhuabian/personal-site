"""Chapter 5: two hand-written candidate fixes, no generated code execution."""
def wrong_clamp(x, lower, upper):
    return lower


def correct_clamp(x, lower, upper):
    if lower > upper:
        raise ValueError("下界不能大于上界")
    return max(lower, min(x, upper))


def verify(candidate):
    cases = [(-2, 0, 10, 0), (5, 0, 10, 5),
             (12, 0, 10, 10), (3, 3, 3, 3)]
    failures = []
    for x, lower, upper, expected in cases:
        actual = candidate(x, lower, upper)
        if actual != expected:
            failures.append({"input": (x, lower, upper),
                             "expected": expected, "actual": actual})
    try:
        candidate(5, 10, 0)
        failures.append({"input": (5, 10, 0), "expected": "ValueError"})
    except ValueError:
        pass
    return failures


def replace_exact(source, old, new):
    if not old or source.count(old) != 1:
        raise ValueError("原文匹配不是唯一，停止修改")
    return source.replace(old, new, 1)


if __name__ == "__main__":
    for candidate in (wrong_clamp, correct_clamp):
        failed = verify(candidate)
        print(candidate.__name__, "通过" if not failed else "失败", failed)
    assert verify(wrong_clamp) and not verify(correct_clamp)
    try:
        replace_exact("a = 1\na = 1\n", "a = 1", "a = 2")
    except ValueError as error:
        print("拒绝含糊修改：", error)
