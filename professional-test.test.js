import test from "node:test";
import assert from "node:assert/strict";
import {
  createProfessionalTest,
  chooseProfessionalSignal,
  answerProfessionalTrial,
} from "./professional-test.js";

function confirm(testState) {
  for (const [signal, answer] of [[true, "yes"], [false, "no"], [true, "yes"]]) {
    answerProfessionalTrial(testState, signal, answer);
  }
}

function reject(testState) {
  answerProfessionalTrial(testState, true, "no");
}

test("starts low at 10000 Hz and narrows in the right direction", () => {
  const audible = createProfessionalTest();
  confirm(audible);
  assert.equal(audible.frequency, 5000);

  const inaudible = createProfessionalTest();
  reject(inaudible);
  assert.equal(inaudible.frequency, 15000);
});

test("reports correctness for sound and silence", () => {
  const state = createProfessionalTest();
  assert.equal(answerProfessionalTrial(state, true, "no").correct, false);
  assert.equal(answerProfessionalTrial(state, false, "no").correct, true);
  assert.equal(answerProfessionalTrial(state, false, "yes").correct, false);
  assert.equal(answerProfessionalTrial(state, true, "yes").correct, true);
  assert.throws(() => answerProfessionalTrial(state, true, "unknown"), TypeError);
});

test("certain hearing confirms a sounding frequency immediately in both phases", () => {
  const state = createProfessionalTest();
  assert.equal(answerProfessionalTrial(state, true, "certain").correct, true);
  assert.equal(state.phase, "low");
  assert.equal(state.frequency, 5000);
  assert.equal(state.confirmed, 1);
  assert.equal(state.trials, 0);

  state.phase = "high";
  state.lower = 10000;
  state.upper = 25001;
  state.frequency = 15000;
  assert.equal(answerProfessionalTrial(state, true, "certain").correct, true);
  assert.equal(state.lower, 15000);
  assert.equal(state.frequency, 20000);
  assert.equal(state.confirmed, 2);
});

test("certain hearing on silence is wrong and advances as inaudible", () => {
  const state = createProfessionalTest();
  const result = answerProfessionalTrial(state, false, "certain");
  assert.equal(result.correct, false);
  assert.equal(state.frequency, 15000);
  assert.equal(state.trials, 0);
  assert.equal(state.streak, 0);
});

test("third correct trial contains sound after two silent trials", () => {
  const state = createProfessionalTest();
  for (let i = 0; i < 2; i += 1) {
    assert.equal(chooseProfessionalSignal(state, () => 0.9), false);
    answerProfessionalTrial(state, false, "no");
  }
  assert.equal(state.frequency, 10000);
  assert.equal(chooseProfessionalSignal(state, () => 0.9), true);
  answerProfessionalTrial(state, true, "yes");
  assert.equal(state.frequency, 5000);
});

test("third trial stays random when either earlier correct trial played sound", () => {
  for (const signals of [[true, false], [false, true], [true, true]]) {
    const state = createProfessionalTest();
    for (const signal of signals) {
      answerProfessionalTrial(state, signal, signal ? "yes" : "no");
    }
    assert.equal(chooseProfessionalSignal(state, () => 0.9), false);
    assert.equal(chooseProfessionalSignal(state, () => 0.1), true);
  }
});

test("a wrong answer after correct trials advances and resets the streak", () => {
  const state = createProfessionalTest();
  answerProfessionalTrial(state, false, "no");
  answerProfessionalTrial(state, false, "no");
  assert.equal(chooseProfessionalSignal(state, () => 0.9), true);
  answerProfessionalTrial(state, true, "no");
  assert.equal(state.frequency, 15000);
  assert.equal(state.streak, 0);
  assert.equal(state.trials, 0);
  assert.equal(chooseProfessionalSignal(state, () => 0.9), false);
});

test("silent-only answers cannot confirm hearing even if a caller bypasses signal selection", () => {
  const state = createProfessionalTest();
  for (let i = 0; i < 3; i += 1) {
    answerProfessionalTrial(state, false, "no");
  }
  assert.equal(state.frequency, 10000);
  answerProfessionalTrial(state, true, "yes");
  assert.equal(state.frequency, 5000);
});

test("a wrong answer during low search moves the lower bound immediately", () => {
  const state = createProfessionalTest();
  answerProfessionalTrial(state, true, "certain");
  assert.equal(state.frequency, 5000);
  answerProfessionalTrial(state, false, "yes");
  assert.equal(state.lower, 5000);
  assert.equal(state.frequency, 7500);
  assert.equal(state.streak, 0);
});

test("a wrong answer during high search moves the upper bound immediately", () => {
  const state = createProfessionalTest();
  state.phase = "high";
  state.lower = 10000;
  state.upper = 25001;
  state.frequency = 15000;
  answerProfessionalTrial(state, true, "yes");
  answerProfessionalTrial(state, false, "yes");
  assert.equal(state.upper, 15000);
  assert.equal(state.frequency, 12500);
  assert.equal(state.streak, 0);
});

test("finds both boundaries and terminates", () => {
  const state = createProfessionalTest();
  let cycles = 0;
  while (state.phase !== "done" && cycles++ < 100) {
    const audible = state.frequency >= 123 && state.frequency <= 18347;
    if (audible) confirm(state);
    else reject(state);
  }
  assert.ok(cycles < 100);
  assert.equal(state.minimum, 123);
  assert.equal(state.maximum, 18347);
});

function runRange(minimum, maximum) {
  const state = createProfessionalTest();
  let cycles = 0;
  while (state.phase !== "done" && cycles++ < 100) {
    const audible = state.frequency >= minimum && state.frequency <= maximum;
    if (audible) confirm(state);
    else reject(state);
  }
  assert.ok(cycles < 100);
  return state;
}

test("finds a lower-range anchor when 10000 Hz is inaudible", () => {
  const state = runRange(73, 7800);
  assert.equal(state.minimum, 73);
  assert.equal(state.maximum, 7800);
});

test("narrows audible bands above, below and across the starting tone", () => {
  for (const [minimum, maximum] of [
    [17, 36],
    [350, 2400],
    [9000, 20000],
    [12000, 18000],
  ]) {
    const state = runRange(minimum, maximum);
    assert.equal(state.minimum, minimum);
    assert.equal(state.maximum, maximum);
  }
});

test("handles both inclusive ends of the supported range", () => {
  const state = runRange(10, 25000);
  assert.equal(state.minimum, 10);
  assert.equal(state.maximum, 25000);
});

test("handles a single audible endpoint without leaving the range", () => {
  for (const endpoint of [10, 25000]) {
    const state = runRange(endpoint, endpoint);
    assert.equal(state.minimum, endpoint);
    assert.equal(state.maximum, endpoint);
  }
});

test("an unconfirmed range ends without fabricating a result", () => {
  const state = createProfessionalTest();
  let cycles = 0;
  while (state.phase !== "done" && cycles++ < 100) reject(state);
  assert.equal(state.phase, "done");
  assert.equal(state.minimum, null);
  assert.equal(state.maximum, null);
});
