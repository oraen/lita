import { VISION_MAX_SIZE, answerVisionTrial, createVisionTest } from "./vision-test.js";
import { getLevelBadgeClass } from "./level-badge.js";
import { getVisionLevelRank, getVisionTitle } from "./vision-title.js";

const STORAGE_KEY = "lita-vision-records";
const MAX_RECORDS = 30;
const DIRECTIONS = [
  { id: "right", rotation: 0 },
  { id: "down", rotation: 90 },
  { id: "left", rotation: 180 },
  { id: "up", rotation: 270 },
];

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

export function setupVisionTest({ formatDate, showToast }) {
  const session = document.querySelector("#vision-test-session");
  const resultPanel = document.querySelector("#vision-result");
  const optotype = document.querySelector("#vision-optotype");
  const trialCount = document.querySelector("#vision-trial-count");
  const currentSize = document.querySelector("#vision-current-size");
  const status = document.querySelector("#vision-status");
  const directionPad = document.querySelector("#vision-direction-pad");
  const history = document.querySelector("#vision-history");
  const resultScore = document.querySelector("#vision-result-score");
  const resultNote = document.querySelector("#vision-result-note");
  const reportDialog = document.querySelector("#vision-report-dialog");
  const reportTime = document.querySelector("#vision-report-time");
  const reportScore = document.querySelector("#vision-report-score");
  const reportDiagnosis = document.querySelector("#vision-report-diagnosis");

  let testState = null;
  let currentDirection = null;
  let acceptingAnswer = false;

  function readRecords() {
    try {
      const records = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(records) ? records : [];
    } catch {
      return [];
    }
  }

  function scoreLabel(record) {
    if (record.score !== null) return `${record.score} L`;
    const maximumSize = record.maximumSize ?? 200;
    return `> ${maximumSize} L`;
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
    reportScore.textContent = scoreLabel(record);
    reportDiagnosis.textContent = getVisionTitle(record.score);
    reportDialog.showModal();
  }

  function renderHistory() {
    history.replaceChildren();
    const records = readRecords();
    if (!records.length) {
      history.append(createElement("p", "history-empty", "暂无记录"));
      return;
    }
    const header = createElement("div", "history-header vision-history-header");
    header.append(
      createElement("span", "", "时间"),
      createElement("span", "", "测试结果"),
      createElement("span", "", "级别"),
    );
    history.append(header);
    records.forEach((record) => {
      const row = createElement("button", "history-row vision-history-row");
      row.type = "button";
      row.setAttribute("aria-label", `查看 ${formatDate.format(new Date(record.time))} 的视觉测试报告`);
      const time = createElement("time", "", formatDate.format(new Date(record.time)));
      time.dateTime = record.time;
      const title = createElement(
        "strong",
        `level-badge ${getLevelBadgeClass(getVisionLevelRank(record.score))}`,
        getVisionTitle(record.score),
      );
      row.append(time, createElement("strong", "", scoreLabel(record)), title);
      row.addEventListener("click", () => openReport(record));
      history.append(row);
    });
  }

  function chooseDirection() {
    const choices = DIRECTIONS.filter((direction) => direction.id !== currentDirection?.id);
    currentDirection = choices[Math.floor(Math.random() * choices.length)];
  }

  function renderTrial(message = "请选择 E 的开口方向") {
    chooseDirection();
    optotype.style.width = `${testState.size}px`;
    optotype.style.height = `${testState.size}px`;
    optotype.style.transform = `rotate(${currentDirection.rotation}deg)`;
    trialCount.textContent = `第 ${testState.trials + 1} 次判断`;
    currentSize.textContent = `当前：${testState.size}L`;
    status.textContent = message;
    acceptingAnswer = true;
  }

  function finishTest() {
    const record = {
      time: new Date().toISOString(),
      score: testState.result,
      maximumSize: VISION_MAX_SIZE,
    };
    saveRecord(record);
    renderHistory();
    session.hidden = true;
    resultPanel.hidden = false;
    resultScore.textContent = testState.result === null ? `> ${VISION_MAX_SIZE}` : String(testState.result);
    resultNote.textContent = testState.result === null
      ? "在当前测试范围内未能稳定辨认，请调整距离或光线后重试。"
      : "数值越小，代表能够辨认越小的方向视标。";
    console.debug("[视觉测试] 测试完成", {
      score: testState.result,
      trials: testState.trials,
      decisions: testState.decisions,
    });
  }

  function answer(direction) {
    if (!acceptingAnswer || !testState || testState.phase !== "testing") return;
    acceptingAnswer = false;
    const displayedSize = testState.size;
    const displayedDirection = currentDirection.id;
    const correct = direction === displayedDirection;
    const outcome = answerVisionTrial(testState, correct);
    console.debug("[视觉测试] 单次判断", {
      trial: testState.trials,
      size: displayedSize,
      direction: displayedDirection,
      answer: direction,
      correct,
      decision: outcome.decision,
      nextSize: testState.size,
    });
    if (outcome.done) {
      finishTest();
      return;
    }
    const message = outcome.decision
      ? "尺寸已调整，请继续判断"
      : "方向已记录，请再判断一次";
    renderTrial(message);
  }

  function startTest() {
    testState = createVisionTest();
    currentDirection = null;
    session.hidden = false;
    resultPanel.hidden = true;
    renderTrial();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function ensureStarted() {
    if (!testState) startTest();
  }

  function leaveTest() {
    testState = null;
    currentDirection = null;
    acceptingAnswer = false;
    session.hidden = false;
    resultPanel.hidden = true;
  }

  document.querySelector("#vision-start").addEventListener("click", () => {
    location.hash = "vision-test";
  });
  directionPad.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-direction]");
    if (button) answer(button.dataset.direction);
  });
  document.querySelector("#vision-restart").addEventListener("click", startTest);
  document.querySelector("#vision-result-back").addEventListener("click", () => {
    location.hash = "vision";
  });
  document.querySelector("#vision-report-close").addEventListener("click", () => reportDialog.close());
  reportDialog.addEventListener("click", (event) => {
    if (event.target === reportDialog) reportDialog.close();
  });
  renderHistory();

  return { ensureStarted, leaveTest, renderHistory };
}
