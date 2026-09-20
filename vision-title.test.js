import test from "node:test";
import assert from "node:assert/strict";
import { getVisionLevelRank, getVisionTitle } from "./vision-title.js";

test("根据最小可见 px 生成视觉级别", () => {
  const cases = [
    [null, "纯瞎"],
    [101, "纯瞎"],
    [100, "半瞎"],
    [50.5, "半瞎"],
    [50, "选择性瞎"],
    [25, "不瞎"],
    [12, "老花眼"],
    [6, "入门眼"],
    [4.5, "入门眼"],
    [4, "大众眼"],
    [3.5, "青铜眼"],
    [3, "白银眼"],
    [2.5, "黄金眼"],
    [2, "白金眼"],
    [1.5, "钻石眼"],
    [1, "天眼"],
  ];

  for (const [score, expected] of cases) {
    assert.equal(getVisionTitle(score), expected, `${score} px`);
  }
});

test("视觉级别按数值越小等级越高排列", () => {
  assert.equal(getVisionLevelRank(1), 0);
  assert.equal(getVisionLevelRank(1.5), 1);
  assert.equal(getVisionLevelRank(4), 6);
  assert.equal(getVisionLevelRank(4.5), 7);
  assert.equal(getVisionLevelRank(null), 12);
});
