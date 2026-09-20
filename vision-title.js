function getVisionLevel(score) {
  if (score === null) return { title: "纯瞎", rank: 12 };
  if (!Number.isFinite(Number(score))) return { title: "未获得", rank: null };

  const size = Number(score);
  if (size > 100) return { title: "纯瞎", rank: 12 };
  if (size > 50) return { title: "半瞎", rank: 11 };
  if (size > 25) return { title: "选择性瞎", rank: 10 };
  if (size > 12) return { title: "不瞎", rank: 9 };
  if (size > 6) return { title: "老花眼", rank: 8 };
  if (size > 4) return { title: "入门眼", rank: 7 };
  if (size >= 4) return { title: "大众眼", rank: 6 };
  if (size >= 3.5) return { title: "青铜眼", rank: 5 };
  if (size >= 3) return { title: "白银眼", rank: 4 };
  if (size >= 2.5) return { title: "黄金眼", rank: 3 };
  if (size >= 2) return { title: "白金眼", rank: 2 };
  if (size >= 1.5) return { title: "钻石眼", rank: 1 };
  return { title: "天眼", rank: 0 };
}

export function getVisionTitle(score) {
  return getVisionLevel(score).title;
}

export function getVisionLevelRank(score) {
  return getVisionLevel(score).rank;
}
