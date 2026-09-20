import test from "node:test";
import assert from "node:assert/strict";
import {
  VISION_MAX_SIZE,
  VISION_MIN_SIZE,
  VISION_SIZE_STEP,
  VISION_START_SIZE,
  VISION_VISIBLE_STREAK,
  VISION_INVISIBLE_STREAK,
  answerVisionTrial,
  createVisionTest,
} from "./vision-test.js";

test("视觉测试从 100px 开始", () => {
  const state = createVisionTest();
  assert.equal(state.size, VISION_START_SIZE);
  assert.equal(state.phase, "testing");
});

test("连续答对三次后缩小 E", () => {
  const state = createVisionTest();
  const first = answerVisionTrial(state, true);
  assert.equal(first.decision, null);
  assert.equal(state.size, 100);
  const second = answerVisionTrial(state, true);
  assert.equal(second.decision, null);
  assert.equal(state.size, 100);
  const third = answerVisionTrial(state, true);
  assert.equal(third.decision, "visible");
  assert.equal(state.size, 50);
});

test("100px 连续答错两次后返回大于 100px", () => {
  const state = createVisionTest();
  answerVisionTrial(state, false);
  const second = answerVisionTrial(state, false);
  assert.equal(second.decision, "invisible");
  assert.equal(state.phase, "done");
  assert.equal(state.result, null);
  assert.equal(state.size, 100);
});

test("一对一错会一直停留在当前尺寸", () => {
  const state = createVisionTest();
  for (let index = 0; index < 10; index += 1) {
    answerVisionTrial(state, index % 2 === 0);
  }
  assert.equal(state.size, VISION_START_SIZE);
  assert.equal(state.decisions, 0);
  assert.equal(state.phase, "testing");
});

test("以 0.5px 精度向上下边界逼近", () => {
  const state = createVisionTest();
  for (const expected of [50, 25, 12.5]) {
    for (let count = 0; count < VISION_VISIBLE_STREAK; count += 1) {
      answerVisionTrial(state, true);
    }
    assert.equal(state.size, expected);
  }

  for (let count = 0; count < VISION_INVISIBLE_STREAK; count += 1) {
    answerVisionTrial(state, false);
  }
  assert.equal(state.size, 18.5);

  for (let count = 0; count < VISION_VISIBLE_STREAK; count += 1) {
    answerVisionTrial(state, true);
  }
  assert.equal(state.size, 15.5);
});

function runThreshold(threshold) {
  const state = createVisionTest();
  let guard = 0;
  while (state.phase !== "done" && guard++ < 100) {
    const visible = state.size >= threshold;
    const required = visible ? VISION_VISIBLE_STREAK : VISION_INVISIBLE_STREAK;
    for (let count = 0; count < required; count += 1) {
      answerVisionTrial(state, visible);
    }
  }
  assert.ok(guard < 100);
  return state;
}

test("用中值搜索得到用户最小可见 px", () => {
  for (const threshold of [1, 3.5, 17, 53.5, 99.5, 100]) {
    assert.equal(runThreshold(threshold).result, threshold);
  }
});

test("搜索过程始终使用 0.5px 步长", () => {
  const state = createVisionTest();
  let guard = 0;
  while (state.phase !== "done" && guard++ < 100) {
    assert.equal((state.size - VISION_MIN_SIZE) % VISION_SIZE_STEP, 0);
    const visible = state.size >= 3.5;
    const required = visible ? VISION_VISIBLE_STREAK : VISION_INVISIBLE_STREAK;
    for (let count = 0; count < required; count += 1) {
      answerVisionTrial(state, visible);
    }
  }
  assert.equal(state.result, 3.5);
});

test("达到 100px 仍连续答错时返回大于 100px", () => {
  const state = createVisionTest();
  let guard = 0;
  while (state.phase !== "done" && guard++ < 100) {
    answerVisionTrial(state, false);
    answerVisionTrial(state, false);
  }
  assert.equal(state.result, null);
  assert.equal(state.invisibleLowerBound, VISION_MAX_SIZE);
});

test("搜索结果不会越过支持范围", () => {
  assert.equal(runThreshold(VISION_MIN_SIZE).result, VISION_MIN_SIZE);
  assert.equal(runThreshold(VISION_MAX_SIZE).result, VISION_MAX_SIZE);
});
