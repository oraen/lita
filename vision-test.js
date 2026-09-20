export const VISION_MIN_SIZE = 1;
export const VISION_MAX_SIZE = 100;
export const VISION_START_SIZE = 100;
export const VISION_SIZE_STEP = 0.5;
export const VISION_VISIBLE_STREAK = 3;
export const VISION_INVISIBLE_STREAK = 2;

export function createVisionTest() {
  return {
    size: VISION_START_SIZE,
    invisibleLowerBound: VISION_MIN_SIZE - VISION_SIZE_STEP,
    visibleUpperBound: VISION_MAX_SIZE,
    upperBoundConfirmed: false,
    correctStreak: 0,
    wrongStreak: 0,
    trials: 0,
    decisions: 0,
    phase: "testing",
    result: null,
  };
}

function finishOrSelectNext(test) {
  if (test.visibleUpperBound - test.invisibleLowerBound <= VISION_SIZE_STEP) {
    if (test.upperBoundConfirmed || test.invisibleLowerBound >= test.visibleUpperBound) {
      test.phase = "done";
      test.result = test.upperBoundConfirmed ? test.visibleUpperBound : null;
    } else {
      // 最大尺寸还没有经过实际确认，必须再展示一次才能给出边界结果。
      test.size = test.visibleUpperBound;
    }
    return;
  }
  const midpoint = (test.invisibleLowerBound + test.visibleUpperBound) / 2;
  test.size = Math.floor(midpoint / VISION_SIZE_STEP) * VISION_SIZE_STEP;
}

export function answerVisionTrial(test, correct) {
  if (test.phase !== "testing") throw new Error("视觉测试已经结束");
  if (typeof correct !== "boolean") throw new TypeError("correct 必须是布尔值");

  const previousSize = test.size;
  test.trials += 1;
  if (correct) {
    test.correctStreak += 1;
    test.wrongStreak = 0;
  } else {
    test.wrongStreak += 1;
    test.correctStreak = 0;
  }

  let decision = null;
  if (test.correctStreak >= VISION_VISIBLE_STREAK) {
    decision = "visible";
    test.visibleUpperBound = test.size;
    test.upperBoundConfirmed = true;
  } else if (test.wrongStreak >= VISION_INVISIBLE_STREAK) {
    decision = "invisible";
    test.invisibleLowerBound = test.size;
  }

  if (decision) {
    test.correctStreak = 0;
    test.wrongStreak = 0;
    test.decisions += 1;
    finishOrSelectNext(test);
  }

  return {
    correct,
    decision,
    sizeChanged: test.size !== previousSize,
    done: test.phase === "done",
    result: test.result,
  };
}
