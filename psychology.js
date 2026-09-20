import {
  FAVORITE_SELECTION_COUNT,
  FIRST_SELECTION_COUNT,
  averagePsychologyScores,
  createPsychologyRounds,
  parsePsychologyImageAge,
  scorePsychologyChoice,
  shufflePsychologyItems,
} from "./psychology-test.js";
import { getPsychologyLevelRank, getPsychologyTitle } from "./psychology-title.js";
import { getLevelBadgeClass } from "./level-badge.js";

const imageSources = import.meta.glob("./source/psychology/*.jpg", {
  eager: true,
  import: "default",
  query: "?url",
});

const psychologyImages = Object.entries(imageSources).map(([path, url]) => ({
  id: path,
  url,
  age: parsePsychologyImageAge(path),
}));

const STORAGE_KEY = "lita-psychology-records";
const MAX_RECORDS = 30;

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

export function setupPsychologyTest({ formatDate, showToast }) {
  const content = document.querySelector("#psychology-content");
  const history = document.querySelector("#psychology-history");
  const stageLabel = document.querySelector("#psychology-stage-label");
  const stageMeta = document.querySelector("#psychology-stage-meta");
  const progressFill = document.querySelector("#psychology-progress-fill");
  const reportDialog = document.querySelector("#psychology-report-dialog");
  const reportTime = document.querySelector("#psychology-report-time");
  const reportScore = document.querySelector("#psychology-report-score");
  const reportDiagnosis = document.querySelector("#psychology-report-diagnosis");

  let phase = "idle";
  let firstSelection = new Set();
  let favoriteSelection = new Set();
  let imageOrder = [];
  let rounds = [];
  let roundIndex = 0;
  let roundStartedAt = 0;
  let roundLocked = false;
  let scores = [];

  function setProgress(label, meta, percent) {
    stageLabel.textContent = label;
    stageMeta.textContent = meta;
    progressFill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  }

  function readRecords() {
    try {
      const records = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(records) ? records : [];
    } catch {
      return [];
    }
  }

  function saveRecord(record) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([record, ...readRecords()].slice(0, MAX_RECORDS)),
      );
    } catch {
      showToast("记录保存失败，请检查浏览器存储空间");
    }
  }

  function openReport(record) {
    reportTime.textContent = formatDate.format(new Date(record.time));
    reportScore.textContent = `${Number(record.score).toFixed(2)} 岁`;
    reportDiagnosis.textContent = getPsychologyTitle(record.score);
    reportDialog.showModal();
  }

  function renderHistory() {
    history.replaceChildren();
    const records = readRecords();
    if (!records.length) {
      history.append(createElement("p", "history-empty", "暂无记录"));
      return;
    }

    const header = createElement("div", "history-header psychology-history-header");
    header.append(
      createElement("span", "", "时间"),
      createElement("span", "", "心理年龄"),
      createElement("span", "", "级别"),
    );
    history.append(header);

    records.forEach((record) => {
      const row = createElement("button", "history-row psychology-history-row");
      row.type = "button";
      row.setAttribute("aria-label", `查看 ${formatDate.format(new Date(record.time))} 的心理年龄测试报告`);
      const time = createElement("time", "", formatDate.format(new Date(record.time)));
      time.dateTime = record.time;
    const score = createElement("strong", "", `${Number(record.score).toFixed(2)} 岁`);
      const title = createElement(
        "strong",
        `level-badge ${getLevelBadgeClass(getPsychologyLevelRank(record.score))}`,
        getPsychologyTitle(record.score),
      );
      row.append(time, score, title);
      row.addEventListener("click", () => openReport(record));
      history.append(row);
    });
  }

  function updateSelectionState(selected, required, count, button, cards) {
    count.textContent = `${selected.size} / ${required}`;
    button.disabled = selected.size !== required;
    cards.forEach(({ image, card }) => {
      const isSelected = selected.has(image.id);
      card.classList.toggle("is-selected", isSelected);
      card.setAttribute("aria-pressed", String(isSelected));
    });
  }

  function renderImageSelection({
    images,
    selected,
    required,
    title,
    description,
    actionLabel,
    onContinue,
  }) {
    content.replaceChildren();
    const section = createElement("section", "psychology-selection");
    const heading = createElement("h2", "psychology-selection-title", title);
    const note = createElement("p", "psychology-selection-note", description);
    const grid = createElement("div", "psychology-image-grid");
    const cards = [];

    images.forEach((image, index) => {
      const card = createElement("button", "psychology-image-choice");
      card.type = "button";
      card.setAttribute("aria-pressed", "false");
      card.setAttribute("aria-label", `备选图片 ${index + 1}`);
      const picture = document.createElement("img");
      picture.src = image.url;
      picture.alt = "";
      picture.loading = index < 6 ? "eager" : "lazy";
      picture.decoding = "async";
      const check = createElement("span", "psychology-image-check", "✓");
      card.append(picture, check);
      card.addEventListener("click", () => {
        if (selected.has(image.id)) selected.delete(image.id);
        else if (selected.size < required) selected.add(image.id);
        else {
          showToast(`最多选择 ${required} 张图片`);
          return;
        }
        updateSelectionState(selected, required, count, continueButton, cards);
      });
      cards.push({ image, card });
      grid.append(card);
    });

    const action = createElement("div", "psychology-selection-action");
    const countWrap = createElement("span", "psychology-select-count", "已选择 ");
    const count = createElement("strong", "", `0 / ${required}`);
    countWrap.append(count);
    const continueButton = createElement("button", "play-button", actionLabel);
    continueButton.type = "button";
    continueButton.disabled = true;
    continueButton.addEventListener("click", onContinue);
    action.append(countWrap, continueButton);
    section.append(heading, note, grid, action);
    content.append(section);
    updateSelectionState(selected, required, count, continueButton, cards);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderFirstSelection() {
    phase = "first-selection";
    setProgress("图片初选", "第 1 步，共 3 步", 12);
    renderImageSelection({
      images: imageOrder,
      selected: firstSelection,
      required: FIRST_SELECTION_COUNT,
      title: "凭直觉选出最喜欢的 12 张",
      description: "不需要考虑图片代表什么，选择第一眼让你更有好感的图片。",
      actionLabel: "下一步",
      onContinue: renderFavoriteSelection,
    });
  }

  function renderFavoriteSelection() {
    phase = "favorite-selection";
    favoriteSelection = new Set();
    setProgress("再次精选", "第 2 步，共 3 步", 34);
    const selectedImages = imageOrder.filter((image) => firstSelection.has(image.id));
    renderImageSelection({
      images: shufflePsychologyItems(selectedImages),
      selected: favoriteSelection,
      required: FAVORITE_SELECTION_COUNT,
      title: "再选出更喜欢的 6 张",
      description: "这一次只比较刚才选出的图片，选择其中相对更喜欢的 6 张。",
      actionLabel: "开始偏好对比",
      onContinue: beginComparisons,
    });
  }

  function beginComparisons() {
    const chosenImages = imageOrder.filter((image) => firstSelection.has(image.id));
    const favorites = chosenImages.filter((image) => favoriteSelection.has(image.id));
    const relativeLessFavorites = chosenImages.filter((image) => !favoriteSelection.has(image.id));
    rounds = createPsychologyRounds(favorites, relativeLessFavorites);
    roundIndex = 0;
    scores = [];
    phase = "comparison";
    renderComparison();
  }

  function chooseComparison(chosen) {
    if (roundLocked || phase !== "comparison") return;
    roundLocked = true;
    const elapsedMs = Math.max(0, performance.now() - roundStartedAt);
    const round = rounds[roundIndex];
    const other = chosen.label === round.first.label ? round.second : round.first;
    const score = scorePsychologyChoice(chosen.age, other.age, elapsedMs, round.group);
    scores.push(score);
    console.debug("[心理年龄测试] 单轮计分", {
      round: roundIndex + 1,
      group: round.group,
      pair: `${round.first.label}/${round.second.label}`,
      chosen: chosen.label,
      elapsedSeconds: Number((elapsedMs / 1000).toFixed(3)),
      chosenAge: chosen.age,
      otherAge: other.age,
      score: Number(score.toFixed(4)),
    });

    roundIndex += 1;
    if (roundIndex >= rounds.length) finishTest();
    else renderComparison();
  }

  function createPairChoice(image, position) {
    const button = createElement("button", "psychology-pair-choice");
    button.type = "button";
    button.setAttribute("aria-label", `选择${position === 0 ? "左边" : "右边"}的图片`);
    const picture = document.createElement("img");
    picture.src = image.url;
    picture.alt = "";
    picture.decoding = "async";
    button.append(picture, createElement("span", "", "选择这张"));
    button.addEventListener("click", () => chooseComparison(image));
    return button;
  }

  function renderComparison() {
    roundLocked = false;
    const round = rounds[roundIndex];
    const completed = roundIndex;
    setProgress("偏好对比", `第 ${roundIndex + 1} / ${rounds.length} 组`, 34 + completed / rounds.length * 66);
    content.replaceChildren();
    const section = createElement("section", "psychology-comparison");
    section.append(
      createElement("p", "psychology-eyebrow", "凭第一感觉选择"),
      createElement("h2", "psychology-comparison-title", "哪一张更喜欢？"),
      createElement("p", "psychology-comparison-note", "点击相对更有好感的一张，不必反复比较。"),
    );
    const pair = createElement("div", "psychology-pair-grid");
    pair.append(createPairChoice(round.first, 0), createPairChoice(round.second, 1));
    section.append(pair);
    content.append(section);
    roundStartedAt = performance.now();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function finishTest() {
    const rawScore = averagePsychologyScores(scores);
    const score = Number(rawScore.toFixed(2));
    const record = { time: new Date().toISOString(), score };
    console.debug("[心理年龄测试] 最终计分", {
      rounds: scores.map((value) => Number(value.toFixed(4))),
      total: Number(scores.reduce((sum, value) => sum + value, 0).toFixed(4)),
      average: rawScore,
      displayedScore: score,
    });
    saveRecord(record);
    renderHistory();
    phase = "result";
    setProgress("测试完成", "结果已生成", 100);
    content.replaceChildren();

    const result = createElement("section", "psychology-result");
    result.append(
      createElement("p", "psychology-eyebrow", "你的测试结果"),
      createElement("h2", "psychology-result-title", "心理年龄"),
    );
    const value = createElement("div", "psychology-result-value");
    value.append(createElement("strong", "", score.toFixed(2)), createElement("span", "", "岁"));
    result.append(
      value,
      createElement("p", "psychology-result-note", "结果来自本次视觉偏好与选择反应，仅供趣味参考。"),
    );
    const actions = createElement("div", "psychology-result-actions");
    const restart = createElement("button", "play-button", "再测一次");
    restart.type = "button";
    restart.addEventListener("click", startTest);
    const records = createElement("button", "psychology-secondary-button", "返回历史记录");
    records.type = "button";
    records.addEventListener("click", () => { location.hash = "psychology"; });
    actions.append(restart, records);
    result.append(actions);
    content.append(result);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startTest() {
    if (psychologyImages.length < FIRST_SELECTION_COUNT) {
      showToast("测试图片数量不足");
      return;
    }
    imageOrder = shufflePsychologyItems(psychologyImages);
    firstSelection = new Set();
    favoriteSelection = new Set();
    rounds = [];
    scores = [];
    roundIndex = 0;
    renderFirstSelection();
  }

  function ensureStarted() {
    if (phase === "idle") startTest();
  }

  function leaveTest() {
    phase = "idle";
    roundLocked = true;
    content.replaceChildren();
  }

  document.querySelector("#psychology-start").addEventListener("click", () => {
    location.hash = "psychology-test";
  });
  document.querySelector("#psychology-report-close").addEventListener("click", () => reportDialog.close());
  reportDialog.addEventListener("click", (event) => {
    if (event.target === reportDialog) reportDialog.close();
  });
  renderHistory();

  return { ensureStarted, leaveTest, renderHistory };
}
