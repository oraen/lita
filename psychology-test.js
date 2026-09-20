export const FIRST_SELECTION_COUNT = 12;
export const FAVORITE_SELECTION_COUNT = 6;

export const A_PAIR_INDEXES = [
  [0, 1], [0, 2], [1, 2], [1, 3], [2, 3],
  [2, 4], [3, 4], [3, 5], [4, 5], [4, 0],
];

export const B_PAIR_INDEXES = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5],
];

export function parsePsychologyImageAge(filename) {
  const match = decodeURIComponent(filename).match(/-(\d+(?:\.\d+)?)(?:\s*\(\d+\))?\.jpe?g$/i);
  if (!match) throw new Error(`无法从图片名读取年龄：${filename}`);
  return Number(match[1]);
}

export function shufflePsychologyItems(items, random = Math.random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function labelGroup(items, prefix, random) {
  return shufflePsychologyItems(items, random).map((image, index) => ({
    ...image,
    label: `${prefix}${index + 1}`,
  }));
}

function buildGroupRounds(group, pairIndexes, random, groupName) {
  return pairIndexes.map(([firstIndex, secondIndex]) => {
    const pair = [group[firstIndex], group[secondIndex]];
    if (random() < 0.5) pair.reverse();
    return { first: pair[0], second: pair[1], group: groupName };
  });
}

export function createPsychologyRounds(favorites, relativeLessFavorites, random = Math.random) {
  if (favorites.length !== FAVORITE_SELECTION_COUNT ||
      relativeLessFavorites.length !== FAVORITE_SELECTION_COUNT) {
    throw new Error("A 组和 B 组都必须正好包含 6 张图片");
  }

  const groupA = labelGroup(favorites, "A", random);
  const groupB = labelGroup(relativeLessFavorites, "B", random);
  return [
    ...buildGroupRounds(groupA, A_PAIR_INDEXES, random, "A"),
    ...buildGroupRounds(groupB, B_PAIR_INDEXES, random, "B"),
  ];
}

export function scorePsychologyChoice(chosenAge, otherAge, elapsedMs, group) {
  if (![chosenAge, otherAge, elapsedMs].every(Number.isFinite) || elapsedMs < 0) {
    throw new Error("年龄和作答时间必须是有效数字");
  }
  if (group !== "A" && group !== "B") throw new Error("必须指定 A 或 B 组");
  const tier = elapsedMs < 2000 ? 0 : elapsedMs <= 5000 ? 1 : 2;
  const weights = group === "A"
    ? [[2.2, 0.8], [1.9, 1.1], [1.6, 1.4]]
    : [[0.85, 0.15], [0.7, 0.3], [0.6, 0.4]];
  const [chosenWeight, otherWeight] = weights[tier];
  return chosenAge * chosenWeight + otherAge * otherWeight;
}

export function averagePsychologyScores(scores) {
  if (scores.length !== 15 || !scores.every(Number.isFinite)) {
    throw new Error("必须提供有效的轮次分数");
  }
  return scores.reduce((sum, score) => sum + score, 0) / 35;
}
