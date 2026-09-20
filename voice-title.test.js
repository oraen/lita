import test from "node:test";
import assert from "node:assert/strict";
import { getVoiceTitle } from "./voice-title.js";

test("根据最高发声音调生成称号", () => {
  const cases = [
    [599, "发音障碍"],
    [600, "五音不全"],
    [799, "五音不全"],
    [800, "天癞之音"],
    [1000, "全是感情"],
    [1200, "小吴强"],
    [1300, "战平吴强"],
    [1400, "怪叫之源"],
    [1500, "会狮吼功"],
    [1600, "无需技巧"],
    [1800, "会超声波"],
    [1999, "会超声波"],
    [2000, "嘴强王者"],
    [2500, "嘴强王者"],
  ];

  for (const [maximum, expected] of cases) {
    assert.equal(getVoiceTitle(maximum), expected, `${maximum} Hz`);
  }
});

test("未测得最高音调时不授予称号", () => {
  assert.equal(getVoiceTitle(null), "未获得");
  assert.equal(getVoiceTitle(undefined), "未获得");
});
