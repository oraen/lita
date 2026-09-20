import test from "node:test";
import assert from "node:assert/strict";
import { getHearingLevelRank } from "./hearing-title.js";
import { getLevelBadgeClass } from "./level-badge.js";
import { getPsychologyLevelRank } from "./psychology-title.js";
import { getVoiceLevelRank } from "./voice-title.js";

test("级别从最好到最坏依次使用指定颜色", () => {
  const expected = [
    "level-badge--dark-red",
    "level-badge--gold",
    "level-badge--purple",
    "level-badge--blue",
    "level-badge--yellow",
    "level-badge--green",
    "level-badge--gray",
  ];
  expected.forEach((className, rank) => {
    assert.equal(getLevelBadgeClass(rank), className);
  });
  assert.equal(getLevelBadgeClass(7), "level-badge--gray");
  assert.equal(getLevelBadgeClass(20), "level-badge--gray");
});

test("听觉和发声音调按照最高频率由高到低排列级别", () => {
  assert.equal(getHearingLevelRank(22000), 0);
  assert.equal(getHearingLevelRank(20000), 1);
  assert.equal(getHearingLevelRank(1000), 9);
  assert.equal(getVoiceLevelRank(2000), 0);
  assert.equal(getVoiceLevelRank(1800), 1);
  assert.equal(getVoiceLevelRank(500), 10);
});

test("心理年龄以究极体为最高级别，老年阶段统一为灰色", () => {
  assert.equal(getPsychologyLevelRank(37), 0);
  assert.equal(getPsychologyLevelRank(32), 1);
  assert.equal(getPsychologyLevelRank(27), 2);
  assert.equal(getPsychologyLevelRank(42), 6);
  assert.equal(getPsychologyLevelRank(47), 7);
  assert.equal(getPsychologyLevelRank(55), 8);
});
