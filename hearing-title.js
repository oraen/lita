const HEARING_TITLES = [
  [6000, "聋子"],
  [8000, "老年人"],
  [12000, "中老年人"],
  [16000, "老当益壮"],
  [17000, "正值壮年"],
  [18000, "偷听者"],
  [19000, "耳报神"],
  [20000, "大听四方"],
  [22000, "通灵耳"],
];

export function getHearingTitle(maximum) {
  if (!Number.isFinite(maximum)) return "未获得";
  return HEARING_TITLES.find(([limit]) => maximum < limit)?.[1] ?? "天下无耳";
}

export function getHearingLevelRank(maximum) {
  if (!Number.isFinite(maximum)) return null;
  const index = HEARING_TITLES.findIndex(([limit]) => maximum < limit);
  const categoryIndex = index === -1 ? HEARING_TITLES.length : index;
  return HEARING_TITLES.length - categoryIndex;
}
