import { getHearingTitle } from "./hearing-title.js";
import { getPsychologyTitle } from "./psychology-title.js";
import { getVisionTitle } from "./vision-title.js";
import { getVoiceTitle } from "./voice-title.js";

export const CERTIFICATE_TITLES = {
  report: "检查报告",
  health: "健康证明",
  forged: "健康证明（非伪造）",
};

export function findLatestRecord(records) {
  if (!Array.isArray(records) || records.length === 0) return null;
  return records.reduce((latest, record) => {
    if (!latest) return record;
    return Date.parse(record.time) > Date.parse(latest.time) ? record : latest;
  }, null);
}

export function formatHearingResult(record) {
  if (!record || !Number.isFinite(record.minimum) || !Number.isFinite(record.maximum)) {
    return "未测试";
  }
  return `${Math.round(record.minimum)}Hz~${Math.round(record.maximum)}Hz(${getHearingTitle(record.maximum)})`;
}

export function formatVoiceResult(record) {
  if (!record || !Number.isFinite(record.minimum) || !Number.isFinite(record.maximum)) {
    return "未测试";
  }
  return `${Math.round(record.minimum)}Hz~${Math.round(record.maximum)}Hz(${getVoiceTitle(record.maximum)})`;
}

export function formatPsychologyResult(record) {
  if (!record || record.score == null || !Number.isFinite(Number(record.score))) return "未测试";
  return `${Number(record.score).toFixed(2)}岁(${getPsychologyTitle(record.score)})`;
}

export function formatVisionResult(record) {
  if (!record || !(record.score === null || Number.isFinite(Number(record.score)))) return "未测试";
  const score = record.score === null
    ? `>${record.maximumSize ?? 200}L`
    : `${Number(record.score)}L`;
  return `${score}(${getVisionTitle(record.score)})`;
}

export function buildCertificateResults(recordGroups) {
  return {
    hearing: formatHearingResult(findLatestRecord(recordGroups.hearing)),
    voice: formatVoiceResult(findLatestRecord(recordGroups.voice)),
    psychology: formatPsychologyResult(findLatestRecord(recordGroups.psychology)),
    vision: formatVisionResult(findLatestRecord(recordGroups.vision)),
  };
}
