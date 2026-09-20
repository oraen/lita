import test from "node:test";
import assert from "node:assert/strict";
import { getHearingTitle } from "./hearing-title.js";

test("根据最高听觉频率生成称号", () => {
  const cases = [
    [5999, "聋子"],
    [6000, "老年人"],
    [7999, "老年人"],
    [8000, "中老年人"],
    [12000, "老当益壮"],
    [16000, "正值壮年"],
    [17000, "偷听者"],
    [18000, "耳报神"],
    [19000, "大听四方"],
    [20000, "通灵耳"],
    [21999, "通灵耳"],
    [22000, "天下无耳"],
    [25000, "天下无耳"],
  ];

  for (const [maximum, expected] of cases) {
    assert.equal(getHearingTitle(maximum), expected, `${maximum} Hz`);
  }
});

test("未测得最高频率时不授予称号", () => {
  assert.equal(getHearingTitle(null), "未获得");
  assert.equal(getHearingTitle(undefined), "未获得");
});
