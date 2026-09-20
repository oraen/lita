import test from "node:test";
import assert from "node:assert/strict";
import {
  A_PAIR_INDEXES,
  B_PAIR_INDEXES,
  averagePsychologyScores,
  createPsychologyRounds,
  parsePsychologyImageAge,
  scorePsychologyChoice,
} from "./psychology-test.js";

test("从中英文图片名末尾读取对应年龄", () => {
  assert.equal(parsePsychologyImageAge("./source/psychology/示例人物-17.jpg"), 17);
  assert.equal(parsePsychologyImageAge("TFBOYS-22.jpg"), 22);
  assert.equal(parsePsychologyImageAge("张学友-52 (2).jpg"), 52);
  assert.throws(() => parsePsychologyImageAge("missing-age.jpg"));
});

test("生成固定的 10 轮 A 组和 5 轮 B 组配对", () => {
  const favorites = Array.from({ length: 6 }, (_, index) => ({ id: `a${index}`, age: 20 + index }));
  const others = Array.from({ length: 6 }, (_, index) => ({ id: `b${index}`, age: 40 + index }));
  const rounds = createPsychologyRounds(favorites, others, () => 0.999999);

  assert.equal(rounds.length, 15);
  assert.deepEqual(rounds.map((round) => round.group), [...Array(10).fill("A"), ...Array(5).fill("B")]);
  assert.deepEqual(
    rounds.slice(0, 10).map(({ first, second }) => [first.label, second.label]),
    A_PAIR_INDEXES.map(([a, b]) => [`A${a + 1}`, `A${b + 1}`]),
  );
  assert.deepEqual(
    rounds.slice(10).map(({ first, second }) => [first.label, second.label]),
    B_PAIR_INDEXES.map(([a, b]) => [`B${a + 1}`, `B${b + 1}`]),
  );
});

test("按照 2 秒和 5 秒边界计算单轮分数", () => {
  for (const [time, aScore, bScore] of [[1999, 76, 23], [2000, 82, 26], [3500, 82, 26], [5000, 82, 26], [5001, 88, 28]]) {
    assert.equal(scorePsychologyChoice(20, 40, time, "A"), aScore);
    assert.equal(scorePsychologyChoice(20, 40, time, "B"), bScore);
  }
});

test("最终分数保留完整平均值供展示层格式化", () => {
  assert.equal(averagePsychologyScores([...Array(10).fill(76), ...Array(5).fill(23)]), 875 / 35);
  assert.equal(averagePsychologyScores([...Array(14).fill(10), 10.125]), 150.125 / 35);
  assert.throws(() => averagePsychologyScores([20, 25, 28]));
});

test("随机交换图片后仍按所属组计算，等龄图片归一化后保持原年龄", () => {
  const images = Array.from({ length: 6 }, (_, id) => ({ id, age: 30 }));
  const rounds = createPsychologyRounds(images, images, () => 0);
  const scores = rounds.map((round, i) => scorePsychologyChoice(
    round.second.age, round.first.age, [1000, 3000, 6000][i % 3], round.group,
  ));
  assert.equal(averagePsychologyScores(scores), 30);
});
