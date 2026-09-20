import test from "node:test";
import assert from "node:assert/strict";
import { getPsychologyTitle } from "./psychology-title.js";

test("根据心理年龄生成诊断结果", () => {
  const cases = [
    [14.99, "幼年期"],
    [15, "未发育"],
    [19.99, "未发育"],
    [20, "发育中"],
    [25, "成熟期"],
    [30, "完全体"],
    [35, "究极体"],
    [40, "中老年人"],
    [45, "老年人"],
    [49.99, "老年人"],
    [50, "待火化"],
    [70, "待火化"],
  ];

  for (const [score, expected] of cases) {
    assert.equal(getPsychologyTitle(score), expected, `${score} 岁`);
  }
});

test("心理年龄缺失时不生成阶段标签", () => {
  assert.equal(getPsychologyTitle(null), "未获得");
  assert.equal(getPsychologyTitle(undefined), "未获得");
  assert.equal(getPsychologyTitle("invalid"), "未获得");
});
