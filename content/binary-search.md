---
title: 写一个小实验：把二分查找的边界看清楚
date: 2026-10-16
category: 技术实践
summary: 用一个有序数组和一段短代码，观察区间如何缩小。先约定边界，再理解每一步为什么成立。
tags: 算法, C++, 小实验
---

二分查找的代码很短，但边界很容易写乱。与其记住一份模板，不如选定一种区间约定，再用一个小实验检查它。

下面是开站时附带的算法示例笔记，可以继续补充自己的测试与理解。

## 先说明我们要找什么

给定一个非递减排列的数组，找到第一个大于等于目标值的位置。如果不存在，就返回数组长度。

这个定义可以同时处理重复元素和找不到目标的情况。例如，在 `[1, 3, 3, 7, 9]` 中查找 3，答案是下标 1；查找 4，答案是下标 3；查找 10，答案是 5。

## 始终使用左闭右开的区间

将还没有检查完的区间记为 `[left, right)`。开始时 `left = 0`，`right = a.size()`。

- 如果中间元素小于目标值，那么它和它左边的元素都不可能是答案。
- 否则，中间元素有可能是答案，继续检查更靠左的位置。
- 当左右边界相遇时，剩余区间为空，当前位置就是答案。

~~~cpp
#include <cassert>
#include <vector>

std::size_t first_not_less(const std::vector<int>& a, int target) {
    std::size_t left = 0;
    std::size_t right = a.size();
    while (left < right) {
        const auto mid = left + (right - left) / 2;
        if (a[mid] < target) {
            left = mid + 1;
        } else {
            right = mid;
        }
    }
    return left;
}

int main() {
    const std::vector<int> a{1, 3, 3, 7, 9};
    assert(first_not_less(a, 3) == 1);
    assert(first_not_less(a, 4) == 3);
    assert(first_not_less(a, 10) == 5);
    assert(first_not_less({}, 3) == 0);
}
~~~

## 观察过程，比只看结果多一步

可以在循环中打印 `left`、`mid` 和 `right`，分别输入小于最小元素、恰好相等、落在两个元素之间和大于最大元素的目标值。

观察时问自己：这一步排除了哪些位置？留下的位置为什么仍然包含我们要找的边界？数组有序是这个过程成立的前提。

## 给实验补上自己的理解

可以继续比较 `std::lower_bound` 的结果，或把需求改为“第一个严格大于目标值的位置”。不要同时改变区间约定和查找目标：一次只改一件事，更容易发现边界变化的原因。
