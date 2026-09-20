import test from "node:test";
import assert from "node:assert/strict";
import {
  CERTIFICATE_TITLES,
  buildCertificateResults,
  findLatestRecord,
} from "./certificate-data.js";

test("三种证书使用对应表头", () => {
  assert.deepEqual(CERTIFICATE_TITLES, {
    report: "检查报告",
    health: "健康证明",
    forged: "健康证明（非伪造）",
  });
});

test("从记录时间选择最后一次测试", () => {
  const older = { time: "2026-01-01T00:00:00.000Z", score: 10 };
  const newer = { time: "2026-02-01T00:00:00.000Z", score: 20 };
  assert.equal(findLatestRecord([newer, older]), newer);
  assert.equal(findLatestRecord([older, newer]), newer);
});

test("证书汇总四项最新测试结果和标签", () => {
  const result = buildCertificateResults({
    hearing: [{ time: "2026-01-01", minimum: 30, maximum: 16839 }],
    voice: [{ time: "2026-01-01", minimum: 120, maximum: 850 }],
    psychology: [{ time: "2026-01-01", score: 27.5 }],
    vision: [{ time: "2026-01-01", score: 3.5, maximumSize: 100 }],
  });
  assert.deepEqual(result, {
    hearing: "30Hz~16839Hz(正值壮年)",
    voice: "120Hz~850Hz(天癞之音)",
    psychology: "27.50岁(成熟期)",
    vision: "3.5L(青铜眼)",
  });
});

test("没有测试记录时显示未测试", () => {
  assert.deepEqual(buildCertificateResults({}), {
    hearing: "未测试",
    voice: "未测试",
    psychology: "未测试",
    vision: "未测试",
  });
});
