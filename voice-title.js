const VOICE_TITLES = [
  [600, "发音障碍"],
  [800, "五音不全"],
  [1000, "天癞之音"],
  [1200, "全是感情"],
  [1300, "小吴强"],
  [1400, "战平吴强"],
  [1500, "怪叫之源"],
  [1600, "会狮吼功"],
  [1800, "无需技巧"],
  [2000, "会超声波"],
];

export function getVoiceTitle(maximum) {
  if (!Number.isFinite(maximum)) return "未获得";
  return VOICE_TITLES.find(([limit]) => maximum < limit)?.[1] ?? "嘴强王者";
}

export function getVoiceLevelRank(maximum) {
  if (!Number.isFinite(maximum)) return null;
  const index = VOICE_TITLES.findIndex(([limit]) => maximum < limit);
  const categoryIndex = index === -1 ? VOICE_TITLES.length : index;
  return VOICE_TITLES.length - categoryIndex;
}
