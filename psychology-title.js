const PSYCHOLOGY_TITLES = [
  [15, "幼年期", 5],
  [20, "未发育", 4],
  [25, "发育中", 3],
  [30, "成熟期", 2],
  [35, "完全体", 1],
  [40, "究极体", 0],
  [45, "中老年人", 6],
  [50, "老年人", 7],
];

export function getPsychologyTitle(score) {
  if (score == null || !Number.isFinite(Number(score))) return "未获得";
  const age = Number(score);
  return PSYCHOLOGY_TITLES.find(([limit]) => age < limit)?.[1] ?? "待火化";
}

export function getPsychologyLevelRank(score) {
  if (score == null || !Number.isFinite(Number(score))) return null;
  const age = Number(score);
  return PSYCHOLOGY_TITLES.find(([limit]) => age < limit)?.[2] ?? 8;
}
