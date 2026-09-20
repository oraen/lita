import { CERTIFICATE_TITLES, buildCertificateResults } from "./certificate-data.js";

const STORAGE_KEYS = {
  hearing: "lita-hearing-records",
  voice: "lita-voice-records",
  psychology: "lita-psychology-records",
  vision: "lita-vision-records",
};

const RESULT_LABELS = {
  hearing: "听力范围",
  voice: "音调范围",
  psychology: "心理年龄",
  vision: "视觉分数",
};

const CERTIFICATE_THEMES = {
  green: { paper: "#fffdf8", header: "#203d39", title: "#fffdf8", ink: "#203d39", accent: "#d6bc84", stripe: "#f0f2ec", muted: "#68756d" },
  blue: { paper: "#f8fcff", header: "#c9e5f6", title: "#234e70", ink: "#234e70", accent: "#7aafcc", stripe: "#eaf4fb", muted: "#607c90" },
  pink: { paper: "#fffafb", header: "#f3cfdb", title: "#783d55", ink: "#69384c", accent: "#c58c9f", stripe: "#faedf2", muted: "#886774" },
  orange: { paper: "#fffbf5", header: "#f5d3af", title: "#784520", ink: "#683e25", accent: "#c58b50", stripe: "#fbefdf", muted: "#877055" },
  purple: { paper: "#fcfaff", header: "#ded2ee", title: "#543970", ink: "#513b68", accent: "#a58cbe", stripe: "#f1ebf8", muted: "#7c6d90" },
  red: { paper: "#fffaf7", header: "#923f4b", title: "#fff4e8", ink: "#71343e", accent: "#d6b17f", stripe: "#f7eaea", muted: "#8c686b" },
  black: { paper: "#fcfbf8", header: "#282a2e", title: "#f7efdf", ink: "#303237", accent: "#bba47a", stripe: "#efeeeb", muted: "#72716d" },
  yellow: { paper: "#fffdf5", header: "#f2dfa0", title: "#625025", ink: "#5f4e27", accent: "#b7a064", stripe: "#f8f1d8", muted: "#837651" },
};

function readRecords(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function loadLatestResults() {
  return buildCertificateResults(Object.fromEntries(
    Object.entries(STORAGE_KEYS).map(([name, key]) => [name, readRecords(key)]),
  ));
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("图片读取失败"));
    image.src = dataUrl;
  });
}

function roundedRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function drawCoverImage(context, image, x, y, width, height) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.naturalWidth - sourceWidth) / 2;
  const sourceY = (image.naturalHeight - sourceHeight) / 2;
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function fitText(context, text, maxWidth) {
  if (context.measureText(text).width <= maxWidth) return text;
  let value = text;
  while (value.length > 1 && context.measureText(`${value}…`).width > maxWidth) {
    value = value.slice(0, -1);
  }
  return `${value}…`;
}

function addCalendarMonths(date, months) {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

function drawCertificateSeal(context, x, y) {
  context.save();
  context.translate(x, y);
  context.rotate(-0.12);
  context.globalAlpha = 0.76;
  context.strokeStyle = "#c92f3d";
  context.fillStyle = "#c92f3d";
  context.lineWidth = 5;
  context.beginPath();
  context.arc(0, 0, 112, 0, Math.PI * 2);
  context.stroke();
  context.lineWidth = 2;
  context.beginPath();
  context.arc(0, 0, 103, 0, Math.PI * 2);
  context.stroke();
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = '700 25px system-ui, "Microsoft YaHei", sans-serif';
  [..."慢手耳鼻喉测试"].forEach((character, index, characters) => {
    const angle = -Math.PI / 2 + (index - (characters.length - 1) / 2) * 0.43;
    context.save();
    context.translate(Math.cos(angle) * 83, Math.sin(angle) * 83);
    context.rotate(angle + Math.PI / 2);
    context.fillText(character, 0, 0);
    context.restore();
  });
  // 用路径绘制兔子头，避免不同设备的 emoji 外观不一致。
  context.beginPath();
  context.ellipse(-19, -13, 12, 35, -0.2, 0, Math.PI * 2);
  context.ellipse(19, -13, 12, 35, 0.2, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.ellipse(0, 27, 39, 32, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#fffdf8";
  for (const eyeX of [-13, 13]) {
    context.beginPath();
    context.arc(eyeX, 24, 3.5, 0, Math.PI * 2);
    context.fill();
  }
  context.beginPath();
  context.moveTo(-4, 36);
  context.lineTo(4, 36);
  context.lineTo(0, 41);
  context.fill();
  context.restore();
}

export function setupCertificate({ showToast }) {
  const typeInputs = [...document.querySelectorAll('input[name="certificate-type"]')];
  const avatarInput = document.querySelector("#certificate-avatar-input");
  const avatarPreview = document.querySelector("#certificate-avatar-preview");
  const avatarPlaceholder = document.querySelector("#certificate-avatar-placeholder");
  const nameInput = document.querySelector("#certificate-name");
  const preview = document.querySelector("#certificate-data-preview");
  const manualPanel = document.querySelector("#certificate-manual-panel");
  const manualInputs = [...manualPanel.querySelectorAll("input[data-result]")];
  const generateButton = document.querySelector("#certificate-generate");
  const outputSection = document.querySelector("#certificate-output-section");
  const outputImage = document.querySelector("#certificate-output");
  const downloadLink = document.querySelector("#certificate-download");

  let avatarImage = null;
  let avatarData = "";
  let avatarRevision = 0;
  let reportFile = null;
  let latestResults = loadLatestResults();

  function saveProfile() {
    try {
      localStorage.setItem("lita-certificate-profile", JSON.stringify({
        nickname: nameInput.value, avatar: avatarData,
      }));
    } catch {
      showToast("浏览器存储空间不足，头像和称呼暂时无法缓存");
    }
  }
  function showAvatar(image, data) {
    avatarImage = image;
    avatarData = data;
    avatarPreview.src = data;
    avatarPreview.hidden = false;
    avatarPlaceholder.hidden = true;
  }
  nameInput.addEventListener("change", saveProfile);
  nameInput.addEventListener("input", saveProfile);
  try {
    const profile = JSON.parse(localStorage.getItem("lita-certificate-profile") || "{}");
    if (typeof profile.nickname === "string") nameInput.value = profile.nickname.slice(0, 20);
    if (typeof profile.avatar === "string" && profile.avatar.startsWith("data:image/")) {
      avatarData = profile.avatar;
      const revision = avatarRevision;
      loadImage(profile.avatar).then((image) => {
        if (revision === avatarRevision) showAvatar(image, profile.avatar);
      }).catch(() => {});
    }
  } catch { /* 损坏或不可用的缓存不影响生成报告。 */ }

  downloadLink.addEventListener("click", async (event) => {
    if (!reportFile) {
      event.preventDefault();
      return;
    }
    if (navigator.canShare?.({ files: [reportFile] }) && navigator.share) {
      event.preventDefault();
      try {
        await navigator.share({ files: [reportFile] });
      } catch (error) {
        if (error.name !== "AbortError") {
          showToast("请长按报告图片，选择存储图像");
        }
      }
    } else if (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
      event.preventDefault();
      outputImage.scrollIntoView({ behavior: "smooth", block: "center" });
      showToast("请长按报告图片，选择存储图像");
    }
  });

  function selectedType() {
    return typeInputs.find((input) => input.checked)?.value ?? "report";
  }

  function renderResults() {
    preview.replaceChildren();
    for (const [key, label] of Object.entries(RESULT_LABELS)) {
      const row = document.createElement("div");
      const name = document.createElement("span");
      const value = document.createElement("strong");
      name.textContent = label;
      value.textContent = latestResults[key];
      row.append(name, value);
      preview.append(row);
    }
  }

  function updateType() {
    const forged = selectedType() === "forged";
    manualPanel.hidden = !forged;
    preview.hidden = forged;
  }

  function refresh() {
    latestResults = loadLatestResults();
    renderResults();
    manualInputs.forEach((input) => {
      input.value = latestResults[input.dataset.result];
    });
    updateType();
  }

  avatarInput.addEventListener("change", async () => {
    const [file] = avatarInput.files;
    if (!file) return;
    const revision = ++avatarRevision;
    if (!file.type.startsWith("image/")) {
      showToast("请选择图片文件");
      avatarInput.value = "";
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      showToast("图片不能超过 12MB");
      avatarInput.value = "";
      return;
    }
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const original = await loadImage(dataUrl);
      if (revision !== avatarRevision) return;
      const thumbnail = document.createElement("canvas");
      thumbnail.width = thumbnail.height = 512;
      const thumbnailContext = thumbnail.getContext("2d");
      thumbnailContext.fillStyle = "#ffffff";
      thumbnailContext.fillRect(0, 0, 512, 512);
      drawCoverImage(thumbnailContext, original, 0, 0, 512, 512);
      const compressed = thumbnail.toDataURL("image/jpeg", 0.88);
      const prepared = await loadImage(compressed);
      if (revision !== avatarRevision) return;
      showAvatar(prepared, compressed);
      saveProfile();
    } catch {
      showToast("头像读取失败，请重新选择");
    }
  });

  typeInputs.forEach((input) => input.addEventListener("change", updateType));

  generateButton.addEventListener("click", () => {
    const nickname = nameInput.value.trim();
    if (!avatarImage) {
      showToast("请先选择头像");
      return;
    }
    if (!nickname) {
      showToast("请输入你的称呼");
      nameInput.focus();
      return;
    }

    const type = selectedType();
    const theme = CERTIFICATE_THEMES[
      document.querySelector('#certificate-color').value
    ] ?? CERTIFICATE_THEMES.pink;
    const results = type === "forged"
      ? Object.fromEntries(manualInputs.map((input) => [
        input.dataset.result,
        input.value.trim() || "未测试",
      ]))
      : loadLatestResults();
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const context = canvas.getContext("2d");

    context.fillStyle = theme.paper;
    context.fillRect(0, 0, 1080, 1080);
    context.fillStyle = theme.header;
    context.fillRect(0, 0, 1080, 174);
    context.fillStyle = theme.accent;
    context.fillRect(0, 174, 1080, 6);
    context.fillStyle = theme.title;
    context.font = '700 64px system-ui, "Microsoft YaHei", sans-serif';
    context.textAlign = "left";
    context.fillText(CERTIFICATE_TITLES[type], 64, 112);

    context.save();
    roundedRect(context, 64, 222, 260, 260, 12);
    context.clip();
    drawCoverImage(context, avatarImage, 64, 222, 260, 260);
    context.restore();
    context.fillStyle = theme.ink;
    let nameSize = 62;
    do {
      context.font = `700 ${nameSize}px system-ui, "Microsoft YaHei", sans-serif`;
      if (context.measureText(nickname).width <= 638 || nameSize <= 32) break;
      nameSize -= 2;
    } while (true);
    context.fillText(fitText(context, nickname, 638), 376, 298);

    Object.entries(RESULT_LABELS).forEach(([key, label], index) => {
      const top = 526 + index * 86;
      context.fillStyle = index % 2 === 0 ? theme.stripe : theme.paper;
      context.fillRect(0, top, 1080, 86);
      context.textAlign = "left";
      context.fillStyle = theme.muted;
      context.font = '500 30px system-ui, "Microsoft YaHei", sans-serif';
      context.fillText(label, 64, top + 54);
      context.fillStyle = results[key] === "未测试" ? theme.muted : theme.ink;
      context.font = '600 34px system-ui, "Microsoft YaHei", sans-serif';
      context.fillText(fitText(context, results[key], 714), 302, top + 54);
    });

    const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const validFrom = new Date();
    const validUntil = addCalendarMonths(validFrom, 6);
    context.textAlign = "left";
    context.fillStyle = theme.muted;
    context.font = '500 28px system-ui, "Microsoft YaHei", sans-serif';
    context.fillText(
      `有效期 ${dateFormatter.format(validFrom)} ~ ${dateFormatter.format(validUntil)}`,
      64,
      994,
    );
    drawCertificateSeal(context, 918, 951);

    const dataUrl = canvas.toDataURL("image/png");
    outputImage.src = dataUrl;
    downloadLink.href = dataUrl;
    downloadLink.download = `${CERTIFICATE_TITLES[type]}-${nickname}.png`;
    const bytes = Uint8Array.from(atob(dataUrl.split(",")[1]), (char) => char.charCodeAt(0));
    reportFile = new File([bytes], downloadLink.download, { type: "image/png" });
    outputSection.hidden = false;
    outputSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  refresh();
  return { refresh };
}
