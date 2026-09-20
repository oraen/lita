import {
  createProfessionalTest,
  chooseProfessionalSignal,
  answerProfessionalTrial,
} from "./professional-test.js";
import { getHearingLevelRank, getHearingTitle } from "./hearing-title.js";
import { getVoiceLevelRank, getVoiceTitle } from "./voice-title.js";
import { getLevelBadgeClass } from "./level-badge.js";
import { PitchDetector } from "pitchy";
import {
  VOICE_MAX_PITCH,
  VOICE_MIN_PITCH,
  createPitchRange,
  frequencyToNote,
  trackPitch,
} from "./voice-pitch.js";
import { setupPsychologyTest } from "./psychology.js";
import { setupVisionTest } from "./vision.js";
import { setupCertificate } from "./certificate.js";

const menuItems = document.querySelectorAll(".menu-item");
const toast = document.querySelector(".toast");
const homeHeader = document.querySelector("#home-header");
const homeView = document.querySelector("#home-view");
const homeAuthorCard = document.querySelector("#home-author-card");
const hearingView = document.querySelector("#hearing-view");
const slider = document.querySelector("#frequency-slider");
const frequencyValue = document.querySelector("#frequency-value");
const decreaseButton = document.querySelector("#decrease-frequency");
const increaseButton = document.querySelector("#increase-frequency");
const playButton = document.querySelector("#play-button");
const history = document.querySelector("#history");
const reportDialog = document.querySelector("#report-dialog");
const reportClose = document.querySelector("#report-close");
const professionalView = document.querySelector("#professional-view");
const testIntro = document.querySelector("#test-intro");
const testSession = document.querySelector("#test-session");
const testResult = document.querySelector("#test-result");
const lowPhase = document.querySelector("#low-phase");
const highPhase = document.querySelector("#high-phase");
const testPhaseLabel = document.querySelector("#test-phase-label");
const testPrompt = document.querySelector("#test-prompt");
const testCounter = document.querySelector("#test-counter");
const testFeedback = document.querySelector("#test-feedback");
const nextTrialButton = document.querySelector("#next-trial");
const testAnswers = document.querySelector("#test-answers");
const resultHeading = document.querySelector("#result-heading");
const resultValues = document.querySelector("#result-values");
const voiceView = document.querySelector("#voice-view");
const voiceProfessionalView = document.querySelector("#voice-professional-view");
const psychologyView = document.querySelector("#psychology-view");
const psychologyTestView = document.querySelector("#psychology-test-view");
const visionView = document.querySelector("#vision-view");
const visionTestView = document.querySelector("#vision-test-view");
const certificateView = document.querySelector("#certificate-view");
const voiceDeviceButton = document.querySelector("#voice-device-button");
const voiceDeviceStatus = document.querySelector("#voice-device-status");
const voiceDeviceDetail = document.querySelector("#voice-device-detail");
const voiceIntro = document.querySelector("#voice-intro");
const voiceSession = document.querySelector("#voice-session");
const voiceStart = document.querySelector("#voice-start");
const voiceError = document.querySelector("#voice-error");
const voiceRecording = document.querySelector("#voice-recording");
const voiceLiveNote = document.querySelector("#voice-live-note");
const voiceLiveHz = document.querySelector("#voice-live-hz");
const voiceMinimum = document.querySelector("#voice-minimum");
const voiceMaximum = document.querySelector("#voice-maximum");
const voiceMinimumNote = document.querySelector("#voice-minimum-note");
const voiceMaximumNote = document.querySelector("#voice-maximum-note");
const voiceHistory = document.querySelector("#voice-history");
const voiceReportDialog = document.querySelector("#voice-report-dialog");
const psychologyReportDialog = document.querySelector("#psychology-report-dialog");
const visionReportDialog = document.querySelector("#vision-report-dialog");
const voiceTestChart = document.querySelector("#voice-test-chart");

const MIN_FREQUENCY = 10;
const MAX_FREQUENCY = 25000;
const STORAGE_KEY = "lita-hearing-records";
const VOICE_STORAGE_KEY = "lita-voice-records";
const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
const PROFESSIONAL_SILENT_GAIN = 0.00001;
const formatNumber = new Intl.NumberFormat("zh-CN");
const formatDate = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

let frequency = 1000;
let audioContext;
let oscillator;
let gain;
let professionalOscillator;
let professionalGain;
let toastTimer;
let startingSound = false;
let heldPointerId = null;
let holdDelay;
let holdInterval;
let ignorePointerClick = false;
let professionalTest;
let trialStarting = false;
let trialActive = false;
let trialSignal = false;
let trialFeedback = null;
let testGeneration = 0;
let voiceGeneration = 0;
let voiceMode = null;
let voiceStream;
let voiceContext;
let voiceFrame;
let voiceRange = createPitchRange();
let voiceStartedAt;

const VOICE_CHART_DURATION = 8000;
const VOICE_CHART_MIN = VOICE_MIN_PITCH;
const VOICE_CHART_MAX = VOICE_MAX_PITCH;
const VOICE_MIN_RMS = 0.003;
const VOICE_MIN_CLARITY = 0.5;
const VOICE_SAMPLE_INTERVAL = 45;
const voiceCharts = {
  test: createVoiceChartState(voiceTestChart),
};

function createVoiceChartState(canvas) {
  return {
    canvas,
    points: [],
    smoothedHz: null,
    lastVoicedAt: 0,
  };
}

function resetVoiceChart(mode) {
  const chart = voiceCharts[mode];
  if (!chart) return;
  chart.points = [];
  chart.smoothedHz = null;
  chart.lastVoicedAt = 0;
  drawVoiceChart(chart, performance.now());
}

function addVoiceChartPoint(mode, now, hz) {
  const chart = voiceCharts[mode];
  if (!chart) return;
  let displayHz = null;

  if (hz !== null) {
    const followsRecentPitch = chart.smoothedHz !== null && now - chart.lastVoicedAt < 400;
    chart.smoothedHz = followsRecentPitch
      ? chart.smoothedHz * 0.68 + hz * 0.32
      : hz;
    chart.lastVoicedAt = now;
    displayHz = chart.smoothedHz;
  } else if (now - chart.lastVoicedAt >= 400) {
    chart.smoothedHz = null;
  }

  chart.points.push({ time: now, hz: displayHz });
  const cutoff = now - VOICE_CHART_DURATION;
  while (chart.points.length && chart.points[0].time < cutoff) chart.points.shift();
  drawVoiceChart(chart, now);
}

function drawVoiceChart(chart, now) {
  const canvas = chart.canvas;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pixelWidth = Math.round(width * dpr);
  const pixelHeight = Math.round(height * dpr);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  const context = canvas.getContext("2d");
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);

  const left = 38;
  const right = 10;
  const top = 12;
  const bottom = 22;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const logMin = Math.log(VOICE_CHART_MIN);
  const logMax = Math.log(VOICE_CHART_MAX);
  const yForHz = (hz) => top + (logMax - Math.log(hz)) / (logMax - logMin) * plotHeight;

  context.font = "10px -apple-system, BlinkMacSystemFont, sans-serif";
  context.textAlign = "right";
  context.textBaseline = "middle";
  [100, 200, 400, 800, 1600].forEach((hz) => {
    const y = yForHz(hz);
    context.fillStyle = "#92989a";
    context.fillText(String(hz), left - 7, y);
    context.beginPath();
    context.moveTo(left, y);
    context.lineTo(width - right, y);
    context.strokeStyle = "#e2e8e5";
    context.lineWidth = 1;
    context.stroke();
  });

  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.fillStyle = "#92989a";
  context.fillText("Hz", 8, 12);
  context.fillText("8 秒前", left, height - 6);
  context.textAlign = "right";
  context.fillText("现在", width - right, height - 6);

  const cutoff = now - VOICE_CHART_DURATION;
  const voicedPoints = chart.points.filter((point) => point.hz !== null);
  if (!voicedPoints.length) {
    context.fillStyle = "#9a9fa1";
    context.font = "13px -apple-system, BlinkMacSystemFont, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("等待检测到稳定音调", left + plotWidth / 2, top + plotHeight / 2);
    return;
  }

  context.save();
  context.beginPath();
  context.rect(left, top, plotWidth, plotHeight);
  context.clip();
  context.beginPath();
  let drawing = false;
  let previousTime = 0;
  chart.points.forEach((point) => {
    if (point.hz === null || point.time - previousTime > 220) {
      drawing = false;
      if (point.hz === null) return;
    }
    const x = left + (point.time - cutoff) / VOICE_CHART_DURATION * plotWidth;
    const y = yForHz(Math.min(VOICE_CHART_MAX, Math.max(VOICE_CHART_MIN, point.hz)));
    if (drawing) context.lineTo(x, y);
    else context.moveTo(x, y);
    drawing = true;
    previousTime = point.time;
  });
  context.strokeStyle = "#31836c";
  context.lineWidth = 2.25;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.stroke();
  context.restore();
}

function drawVisibleVoiceCharts() {
  const now = performance.now();
  Object.values(voiceCharts).forEach((chart) => drawVoiceChart(chart, now));
}

function stopStepping() {
  window.clearTimeout(holdDelay);
  window.clearInterval(holdInterval);
  heldPointerId = null;
}

function setupStepButton(button, direction) {
  button.addEventListener("pointerdown", (event) => {
    if ((event.pointerType === "mouse" && event.button !== 0) ||
        heldPointerId !== null || button.disabled) return;
    ignorePointerClick = true;
    heldPointerId = event.pointerId;
    setFrequency(frequency + direction);
    holdDelay = window.setTimeout(() => {
      holdInterval = window.setInterval(() => {
        setFrequency(frequency + direction);
        if (button.disabled) stopStepping();
      }, 25);
    }, 400);
  });
  button.addEventListener("click", (event) => {
    if (ignorePointerClick && event.detail !== 0) {
      ignorePointerClick = false;
      return;
    }
    ignorePointerClick = false;
    setFrequency(frequency + direction);
  });
  button.addEventListener("contextmenu", (event) => event.preventDefault());
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 1800);
}

const psychologyController = setupPsychologyTest({ formatDate, showToast });
const visionController = setupVisionTest({ formatDate, showToast });
const certificateController = setupCertificate({ showToast });

function setFrequency(hz) {
  frequency = Math.min(MAX_FREQUENCY, Math.max(MIN_FREQUENCY, Math.round(hz)));
  frequencyValue.value = formatNumber.format(frequency);
  slider.value = String(frequency);
  slider.setAttribute("aria-valuetext", `${frequency} Hz`);
  decreaseButton.disabled = frequency === MIN_FREQUENCY;
  increaseButton.disabled = frequency === MAX_FREQUENCY;
  if (oscillator) {
    oscillator.frequency.setTargetAtTime(frequency, audioContext.currentTime, 0.015);
  }
}

function stopSound() {
  if (!oscillator) return;
  const activeOscillator = oscillator;
  const activeGain = gain;
  oscillator = null;
  scheduleSmoothGain(activeGain.gain, 0, 0.16);
  activeOscillator.addEventListener("ended", () => {
    activeOscillator.disconnect();
    activeGain.disconnect();
  }, { once: true });
  activeOscillator.stop(audioContext.currentTime + 0.18);
  playButton.textContent = "播放声音";
  playButton.classList.remove("is-playing");
  playButton.setAttribute("aria-pressed", "false");
}

function ensurePlaybackAudioContext() {
  if (!AudioContextConstructor) throw new Error("Web Audio API unavailable");
  if (!audioContext || audioContext.state === "closed") {
    audioContext = new AudioContextConstructor();
  }
  return audioContext;
}

async function resumeAudioContext(context) {
  if (context.state === "running") return;
  const resumeResult = context.resume();
  if (resumeResult && typeof resumeResult.then === "function") await resumeResult;
}

function scheduleSmoothGain(parameter, target, duration) {
  const now = audioContext.currentTime;
  const start = Math.max(0, parameter.value);
  const curve = new Float32Array(96);
  for (let index = 0; index < curve.length; index += 1) {
    const progress = index / (curve.length - 1);
    const eased = 0.5 - 0.5 * Math.cos(Math.PI * progress);
    curve[index] = start + (target - start) * eased;
  }
  parameter.cancelScheduledValues(now);
  parameter.setValueCurveAtTime(curve, now, duration);
}

function professionalOutputGain(hz) {
  if (hz < 80) return 0.12;
  if (hz < 200) return 0.12 + (hz - 80) / 120 * 0.16;
  if (hz > 18000) return 0.2;
  if (hz > 14000) return 0.28;
  return 0.4;
}

function startTone(hz) {
  const now = audioContext.currentTime;
  gain = audioContext.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.connect(audioContext.destination);
  oscillator = audioContext.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(hz, now);
  oscillator.connect(gain);
  oscillator.start(now);
  scheduleSmoothGain(gain.gain, 0.5, 0.32);
}

function ensureProfessionalToneEngine(context) {
  if (professionalOscillator && professionalGain) return false;
  const now = context.currentTime;
  professionalGain = context.createGain();
  professionalGain.gain.setValueAtTime(PROFESSIONAL_SILENT_GAIN, now);
  professionalGain.connect(context.destination);
  professionalOscillator = context.createOscillator();
  professionalOscillator.type = "sine";
  professionalOscillator.frequency.setValueAtTime(1000, now);
  professionalOscillator.connect(professionalGain);
  professionalOscillator.start(now);
  return true;
}

function setProfessionalTone(hz, audible) {
  if (!professionalOscillator || !professionalGain || !audioContext) return;
  professionalOscillator.frequency.setValueAtTime(hz, audioContext.currentTime);
  scheduleSmoothGain(
    professionalGain.gain,
    audible ? professionalOutputGain(hz) : PROFESSIONAL_SILENT_GAIN,
    audible ? 0.8 : 0.24,
  );
}

function silenceProfessionalTone() {
  if (!professionalGain || !audioContext) return;
  scheduleSmoothGain(professionalGain.gain, PROFESSIONAL_SILENT_GAIN, 0.28);
}

function destroyProfessionalToneEngine() {
  if (!professionalOscillator || !professionalGain || !audioContext) {
    professionalOscillator = undefined;
    professionalGain = undefined;
    return;
  }
  const activeOscillator = professionalOscillator;
  const activeGain = professionalGain;
  const now = audioContext.currentTime;
  professionalOscillator = undefined;
  professionalGain = undefined;
  scheduleSmoothGain(activeGain.gain, 0, 0.18);
  activeOscillator.addEventListener("ended", () => {
    activeOscillator.disconnect();
    activeGain.disconnect();
  }, { once: true });
  activeOscillator.stop(now + 0.2);
}

async function toggleSound() {
  if (startingSound) return;
  if (oscillator) {
    stopSound();
    return;
  }

  startingSound = true;
  try {
    const context = ensurePlaybackAudioContext();
    // iOS 要求音频节点在用户点击的同步调用栈中启动。
    startTone(frequency);
    playButton.textContent = "停止播放";
    playButton.classList.add("is-playing");
    playButton.setAttribute("aria-pressed", "true");
    await resumeAudioContext(context);
    if (context.state !== "running") throw new Error(`AudioContext state: ${context.state}`);
    if (hearingView.hidden) stopSound();
    console.debug("[听觉赫兹测试] 音频已启动", {
      state: context.state,
      sampleRate: context.sampleRate,
      frequency,
    });
  } catch (error) {
    stopSound();
    console.error("[听觉赫兹测试] 无法启动音频", error);
    showToast("无法播放声音，请检查媒体音量后重试");
  } finally {
    startingSound = false;
  }
}

function resetProfessionalTest() {
  testGeneration += 1;
  professionalTest = null;
  trialStarting = false;
  trialActive = false;
  trialFeedback = null;
  stopSound();
  destroyProfessionalToneEngine();
}

function showCurrentView() {
  if (reportDialog.open) reportDialog.close();
  if (voiceReportDialog.open) voiceReportDialog.close();
  if (psychologyReportDialog.open) psychologyReportDialog.close();
  if (visionReportDialog.open) visionReportDialog.close();
  const isHearing = location.hash === "#hearing";
  const isProfessional = location.hash === "#professional";
  const isVoice = location.hash === "#voice";
  const isVoiceProfessional = location.hash === "#voice-professional";
  const isPsychology = location.hash === "#psychology";
  const isPsychologyTest = location.hash === "#psychology-test";
  const isVision = location.hash === "#vision";
  const isVisionTest = location.hash === "#vision-test";
  const isCertificate = location.hash === "#certificate";
  homeHeader.hidden = isHearing || isProfessional || isVoice || isVoiceProfessional ||
    isPsychology || isPsychologyTest || isVision || isVisionTest || isCertificate;
  homeView.hidden = homeHeader.hidden;
  if (homeAuthorCard) homeAuthorCard.hidden = homeHeader.hidden;
  hearingView.hidden = !isHearing;
  professionalView.hidden = !isProfessional;
  voiceView.hidden = !isVoice;
  voiceProfessionalView.hidden = !isVoiceProfessional;
  psychologyView.hidden = !isPsychology;
  psychologyTestView.hidden = !isPsychologyTest;
  visionView.hidden = !isVision;
  visionTestView.hidden = !isVisionTest;
  certificateView.hidden = !isCertificate;
  document.title = isCertificate ? "证书办理 - 慢手耳鼻喉测试" :
    isVisionTest ? "视觉测试中 - 机能测试" :
    isVision ? "视觉测试 - 机能测试" :
      isPsychologyTest ? "心理年龄测试中 - 机能测试" :
    isPsychology ? "心理年龄测试 - 机能测试" :
      isVoiceProfessional ? "发声音调专业测试 - 机能测试" :
        isVoice ? "发声音调测试 - 机能测试" :
          isProfessional ? "专业测试 - 机能测试" :
            isHearing ? "听觉赫兹测试 - 机能测试" : "机能测试";
  if (!isHearing) {
    stopStepping();
    stopSound();
  }
  if (!isProfessional) resetProfessionalTest();
  else renderProfessionalState();
  if (voiceMode && ((voiceMode === "device" && !isVoice) ||
      (voiceMode === "test" && !isVoiceProfessional))) {
    stopVoiceCapture();
    if (!isVoiceProfessional) resetVoiceSession();
  }
  if (isPsychologyTest) psychologyController.ensureStarted();
  else psychologyController.leaveTest();
  if (isPsychology) psychologyController.renderHistory();
  if (isVisionTest) visionController.ensureStarted();
  else visionController.leaveTest();
  if (isVision) visionController.renderHistory();
  if (isCertificate) certificateController.refresh();
  window.requestAnimationFrame(drawVisibleVoiceCharts);
}

function stopVoiceCapture() {
  voiceGeneration += 1;
  window.cancelAnimationFrame(voiceFrame);
  voiceFrame = undefined;
  voiceStream?.getTracks().forEach((track) => track.stop());
  voiceStream = undefined;
  if (voiceContext) {
    void voiceContext.close().catch(() => {});
    voiceContext = undefined;
  }
  voiceMode = null;
  voiceDeviceButton.disabled = false;
  voiceDeviceButton.textContent = "检测麦克风";
}

function resetVoiceSession() {
  voiceIntro.hidden = false;
  voiceSession.hidden = true;
  voiceStart.disabled = false;
  voiceStart.textContent = "开始测试";
  voiceError.hidden = true;
  voiceRecording.textContent = "";
  const dot = document.createElement("span");
  dot.className = "voice-recording-dot";
  voiceRecording.append(dot, "正在录音，可以尽情地叫");
  voiceLiveNote.textContent = "--";
  voiceLiveHz.textContent = "等待声音";
  voiceMinimum.textContent = "--";
  voiceMaximum.textContent = "--";
  voiceMinimumNote.textContent = "";
  voiceMaximumNote.textContent = "";
  voiceRange = createPitchRange();
  voiceStartedAt = undefined;
}

function voiceErrorMessage(error) {
  if (!window.isSecureContext)
    return "麦克风需要安全连接，请使用 HTTPS 或在本机通过 localhost 打开";
  if (error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError")
    return "未获得麦克风权限，请在浏览器设置中允许访问";
  if (error?.name === "NotFoundError" || error?.name === "DevicesNotFoundError")
    return "没有找到可用的麦克风";
  return "无法启动麦克风，请检查设备或浏览器设置";
}

function showVoiceRange() {
  for (const [hz, value, note] of [
    [voiceRange.minimum, voiceMinimum, voiceMinimumNote],
    [voiceRange.maximum, voiceMaximum, voiceMaximumNote],
  ]) {
    value.textContent = hz === null ? "--" : `${Math.round(hz)} Hz`;
    note.textContent = hz === null ? "" : frequencyToNote(hz);
  }
}

async function startVoiceCapture(mode) {
  stopVoiceCapture();
  resetVoiceChart(mode);
  const generation = voiceGeneration;
  voiceMode = mode;
  const isTest = mode === "test";
  if (isTest) {
    voiceError.hidden = true;
    voiceStart.disabled = true;
    voiceStart.textContent = "连接麦克风...";
  } else {
    voiceDeviceButton.disabled = true;
    voiceDeviceStatus.textContent = "正在连接麦克风";
    voiceDeviceDetail.textContent = "请允许浏览器使用麦克风";
  }
  try {
    if (!navigator.mediaDevices?.getUserMedia || !AudioContextConstructor)
      throw new Error("microphone unavailable");
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: true,
      },
    });
    if (generation !== voiceGeneration || (isTest ? voiceProfessionalView.hidden : voiceView.hidden)) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    voiceStream = stream;
    voiceContext = new AudioContextConstructor();
    await voiceContext.resume();
    if (generation !== voiceGeneration) return;
    const source = voiceContext.createMediaStreamSource(stream);
    const analyser = voiceContext.createAnalyser();
    analyser.fftSize = 4096;
    source.connect(analyser);
    const buffer = new Float32Array(analyser.fftSize);
    const detector = PitchDetector.forFloat32Array(buffer.length);
    if (isTest) {
      voiceRange = createPitchRange();
      voiceStartedAt = new Date().toISOString();
      voiceIntro.hidden = true;
      voiceSession.hidden = false;
    } else {
      voiceDeviceButton.disabled = false;
      voiceDeviceButton.textContent = "停止检测";
      voiceDeviceStatus.textContent = "麦克风已连接";
      voiceDeviceDetail.textContent = "请说话或哼唱";
    }
    let lastSample = 0;
    let lastSound = 0;
    function sample(now) {
      if (generation !== voiceGeneration) return;
      voiceFrame = window.requestAnimationFrame(sample);
      if (now - lastSample < VOICE_SAMPLE_INTERVAL) return;
      lastSample = now;
      analyser.getFloatTimeDomainData(buffer);
      const rms = Math.sqrt(buffer.reduce((sum, value) => sum + value * value, 0) / buffer.length);
      const [hz, clarity] = rms >= VOICE_MIN_RMS
        ? detector.findPitch(buffer, voiceContext.sampleRate) : [0, 0];
      const hasStablePitch = clarity >= VOICE_MIN_CLARITY &&
        hz >= VOICE_MIN_PITCH && hz <= VOICE_MAX_PITCH;
      addVoiceChartPoint(mode, now, hasStablePitch ? hz : null);
      if (hasStablePitch) {
        lastSound = now;
        if (isTest) {
          voiceLiveNote.textContent = frequencyToNote(hz);
          voiceLiveHz.textContent = `${Math.round(hz)} Hz`;
          if (trackPitch(voiceRange, hz)) showVoiceRange();
        } else {
          voiceDeviceStatus.textContent = "拾音正常";
          voiceDeviceDetail.textContent = `${Math.round(hz)} Hz · ${frequencyToNote(hz)}`;
        }
      } else {
        if (isTest) trackPitch(voiceRange, null);
        if (now - lastSound > 400) {
          if (isTest) {
            voiceLiveNote.textContent = "--";
            voiceLiveHz.textContent = "等待声音";
          } else {
            voiceDeviceStatus.textContent = "麦克风已连接";
            voiceDeviceDetail.textContent = "请说话或哼唱";
          }
        }
      }
    }
    voiceFrame = window.requestAnimationFrame(sample);
    stream.getAudioTracks()[0]?.addEventListener("ended", () => {
      if (generation !== voiceGeneration) return;
      stopVoiceCapture();
      if (isTest) {
        resetVoiceSession();
        showToast("麦克风已断开，测试未保存");
      } else {
        voiceDeviceStatus.textContent = "麦克风已断开";
        voiceDeviceDetail.textContent = "请重新检测";
      }
    });
  } catch (error) {
    if (generation !== voiceGeneration) return;
    stopVoiceCapture();
    if (isTest) {
      resetVoiceSession();
      voiceError.textContent = voiceErrorMessage(error);
      voiceError.hidden = false;
    }
    else {
      voiceDeviceStatus.textContent = "检测未完成";
      voiceDeviceDetail.textContent = voiceErrorMessage(error);
    }
    showToast(voiceErrorMessage(error));
  }
}

function readVoiceRecords() {
  try {
    const records = JSON.parse(localStorage.getItem(VOICE_STORAGE_KEY) || "[]");
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

function voicePitchLabel(hz) {
  return hz == null ? "未测得" : `${Math.round(hz)} Hz · ${frequencyToNote(hz)}`;
}

function openVoiceReport(record) {
  document.querySelector("#voice-report-time").textContent =
    formatDate.format(new Date(record.time));
  document.querySelector("#voice-report-minimum").textContent = voicePitchLabel(record.minimum);
  document.querySelector("#voice-report-maximum").textContent = voicePitchLabel(record.maximum);
  document.querySelector("#voice-report-title-name").textContent = getVoiceTitle(record.maximum);
  voiceReportDialog.showModal();
}

function renderVoiceRecords() {
  voiceHistory.replaceChildren();
  const records = readVoiceRecords();
  if (!records.length) {
    const empty = document.createElement("p");
    empty.className = "history-empty";
    empty.textContent = "暂无记录";
    voiceHistory.append(empty);
    return;
  }
  const header = document.createElement("div");
  header.className = "history-header";
  for (const label of ["时间", "最低音调", "最高音调", "级别"]) {
    const cell = document.createElement("span");
    cell.textContent = label;
    header.append(cell);
  }
  voiceHistory.append(header);
  for (const record of records) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "history-row voice-history-row";
    row.setAttribute("aria-label", `查看 ${formatDate.format(new Date(record.time))} 的发声音调测试报告`);
    const time = document.createElement("time");
    time.dateTime = record.time;
    time.textContent = formatDate.format(new Date(record.time));
    row.append(time);
    for (const hz of [record.minimum, record.maximum]) {
      const cell = document.createElement("span");
      cell.textContent = hz == null ? "未测得" : `${Math.round(hz)} Hz`;
      if (hz != null) {
        const note = document.createElement("small");
        note.textContent = frequencyToNote(hz);
        cell.append(note);
      }
      row.append(cell);
    }
    const title = document.createElement("strong");
    title.className = `level-badge ${getLevelBadgeClass(getVoiceLevelRank(record.maximum))}`;
    title.textContent = getVoiceTitle(record.maximum);
    row.append(title);
    row.addEventListener("click", () => openVoiceReport(record));
    voiceHistory.append(row);
  }
}

function finishVoiceTest() {
  if (voiceMode !== "test" || !voiceStartedAt) return;
  if (voiceRange.minimum === null || voiceRange.maximum === null) {
    stopVoiceCapture();
    resetVoiceSession();
    showToast("未检测到稳定音调，未保存记录");
    return;
  }
  const record = {
    time: voiceStartedAt,
    minimum: voiceRange.minimum,
    maximum: voiceRange.maximum,
  };
  stopVoiceCapture();
  resetVoiceSession();
  try {
    localStorage.setItem(VOICE_STORAGE_KEY, JSON.stringify([record, ...readVoiceRecords()]));
    renderVoiceRecords();
  } catch {
    showToast("记录保存失败，请检查浏览器存储空间");
  }
  openVoiceReport(record);
}

function readRecords() {
  try {
    const records = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

function renderRecords() {
  const records = readRecords();
  history.replaceChildren();
  if (!records.length) {
    const empty = document.createElement("p");
    empty.className = "history-empty";
    empty.textContent = "暂无记录";
    history.append(empty);
    return;
  }

  const header = document.createElement("div");
  header.className = "history-header";
  for (const label of ["时间", "最低音调", "最高音调", "级别"]) {
    const cell = document.createElement("span");
    cell.textContent = label;
    header.append(cell);
  }
  history.append(header);

  for (const record of records) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "history-row";
    row.setAttribute("aria-label", `查看 ${formatDate.format(new Date(record.time))} 的听觉测试报告`);
    const time = document.createElement("time");
    time.dateTime = record.time;
    time.textContent = formatDate.format(new Date(record.time));
    const minimum = document.createElement("span");
    minimum.textContent = record.minimum == null
      ? "未测得" : `${formatNumber.format(record.minimum)} Hz`;
    const maximum = document.createElement("span");
    maximum.textContent = record.maximum == null
      ? "未测得" : `${formatNumber.format(record.maximum)} Hz`;
    const title = document.createElement("strong");
    title.className = `level-badge ${getLevelBadgeClass(getHearingLevelRank(record.maximum))}`;
    title.textContent = getHearingTitle(record.maximum);
    row.append(time, minimum, maximum, title);
    row.addEventListener("click", () => {
      document.querySelector("#report-time").textContent = time.textContent;
      document.querySelector("#report-minimum").textContent = minimum.textContent;
      document.querySelector("#report-maximum").textContent = maximum.textContent;
      document.querySelector("#report-hearing-title").textContent = title.textContent;
      reportDialog.showModal();
    });
    history.append(row);
  }
}

function saveProfessionalResult() {
  const records = readRecords();
  records.unshift({
    time: new Date().toISOString(),
    minimum: professionalTest.minimum,
    maximum: professionalTest.maximum,
  });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    renderRecords();
  } catch {
    showToast("记录保存失败，请检查浏览器存储空间");
  }
}

function renderProfessionalState() {
  testIntro.hidden = Boolean(professionalTest);
  testSession.hidden = !professionalTest ||
    (professionalTest.phase === "done" && !trialFeedback);
  testResult.hidden = !professionalTest ||
    professionalTest.phase !== "done" || Boolean(trialFeedback);
  if (!professionalTest) return;

  if (professionalTest.phase === "done" && !trialFeedback) {
    const { minimum, maximum } = professionalTest;
    resultHeading.textContent = minimum === null ? "未测得听觉范围" : "听觉范围";
    resultValues.replaceChildren();
    for (const [label, hz] of [["最低", minimum], ["最高", maximum]]) {
      const item = document.createElement("div");
      const caption = document.createElement("span");
      caption.textContent = label;
      const value = document.createElement("strong");
      value.textContent = hz === null ? "未测得" : `${formatNumber.format(hz)} Hz`;
      item.append(caption, value);
      resultValues.append(item);
    }
    return;
  }

  const isLow = (trialFeedback?.phase ?? professionalTest.phase) === "low";
  lowPhase.classList.toggle("is-active", isLow);
  highPhase.classList.toggle("is-active", !isLow);
  testPhaseLabel.textContent = isLow ? "低音测试" : "高音测试";
  testPrompt.textContent = trialFeedback
    ? (trialFeedback.correct ? "回答正确" : "回答错误")
    : trialStarting ? "准备中..." :
      trialActive ? "现在有声音吗？" : "准备好后继续";
  testPrompt.classList.toggle("is-correct", Boolean(trialFeedback?.correct));
  testPrompt.classList.toggle("is-incorrect", Boolean(trialFeedback && !trialFeedback.correct));
  testCounter.textContent = trialFeedback ? "本轮已结束" :
    `已判断 ${professionalTest.confirmed} 个频点 · 第 ${professionalTest.trials + 1} 次辨认`;
  testFeedback.hidden = !trialFeedback;
  if (trialFeedback) {
    testFeedback.textContent = trialFeedback.signal
      ? `本轮播放了 ${formatNumber.format(trialFeedback.frequency)} Hz`
      : "本轮没有播放声音";
  }
  nextTrialButton.hidden = trialStarting || trialActive;
  nextTrialButton.textContent = professionalTest.phase === "done"
    ? "查看测试结果" : "开始下一次辨认";
  testAnswers.hidden = !trialActive || Boolean(trialFeedback);
}

async function startProfessionalTrial() {
  if (!professionalTest || professionalTest.phase === "done" ||
      trialActive || trialStarting || trialFeedback) return;
  trialStarting = true;
  renderProfessionalState();
  const generation = testGeneration;
  const signal = chooseProfessionalSignal(professionalTest);
  try {
    const context = ensurePlaybackAudioContext();
    // 整场测试复用同一个振荡器，避免每轮启停在 iPhone 上产生宽频瞬态。
    const engineWasCreated = ensureProfessionalToneEngine(context);
    await resumeAudioContext(context);
    if (context.state !== "running") throw new Error(`AudioContext state: ${context.state}`);
    // 首轮先静音预热音频通道，硬件初始化声不会泄露本轮是否有声音。
    await new Promise((resolve) => window.setTimeout(resolve, engineWasCreated ? 360 : 100));
    if (generation !== testGeneration || professionalView.hidden) {
      return;
    }
    setProfessionalTone(professionalTest.frequency, signal);
    trialSignal = signal;
    trialActive = true;
  } catch (error) {
    destroyProfessionalToneEngine();
    console.error("[听觉专业测试] 无法启动音频", error);
    showToast("无法启动测试声音，请检查媒体音量");
  } finally {
    if (generation === testGeneration) {
      trialStarting = false;
      renderProfessionalState();
    }
  }
}

function startProfessionalTest() {
  stopSound();
  destroyProfessionalToneEngine();
  testGeneration += 1;
  professionalTest = createProfessionalTest();
  trialActive = false;
  trialFeedback = null;
  renderProfessionalState();
  startProfessionalTrial();
}

document.querySelector("#hearing-link").addEventListener("click", () => {
  location.hash = "hearing";
});
document.querySelector("#voice-link").addEventListener("click", () => {
  location.hash = "voice";
});
document.querySelector("#psychology-link").addEventListener("click", () => {
  location.hash = "psychology";
});
document.querySelector("#psychology-back").addEventListener("click", () => {
  location.hash = "";
});
document.querySelector("#psychology-test-back").addEventListener("click", () => {
  location.hash = "psychology";
});
document.querySelector("#vision-link").addEventListener("click", () => {
  location.hash = "vision";
});
document.querySelector("#vision-back").addEventListener("click", () => {
  location.hash = "";
});
document.querySelector("#vision-test-back").addEventListener("click", () => {
  location.hash = "vision";
});
document.querySelector("#certificate-link").addEventListener("click", () => {
  location.hash = "certificate";
});
document.querySelector("#certificate-back").addEventListener("click", () => {
  location.hash = "";
});
document.querySelector("#voice-back").addEventListener("click", () => {
  location.hash = "";
});
document.querySelector("#voice-professional-link").addEventListener("click", () => {
  location.hash = "voice-professional";
});
document.querySelector("#voice-professional-back").addEventListener("click", () => {
  location.hash = "voice";
});
voiceDeviceButton.addEventListener("click", () => {
  if (voiceMode === "device") {
    stopVoiceCapture();
    voiceDeviceStatus.textContent = "检测麦克风";
    voiceDeviceDetail.textContent = "说话或哼唱，确认麦克风能够拾音";
  } else startVoiceCapture("device");
});
voiceStart.addEventListener("click", () => startVoiceCapture("test"));
document.querySelector("#voice-finish").addEventListener("click", finishVoiceTest);
document.querySelector("#voice-report-close").addEventListener("click", () => voiceReportDialog.close());
voiceReportDialog.addEventListener("click", (event) => {
  if (event.target === voiceReportDialog) voiceReportDialog.close();
});
document.querySelector("#back-button").addEventListener("click", () => {
  location.hash = "";
});
document.querySelector("#professional-link").addEventListener("click", () => {
  location.hash = "professional";
});
document.querySelector("#professional-back").addEventListener("click", () => {
  location.hash = "hearing";
});
document.querySelector("#start-test").addEventListener("click", startProfessionalTest);
document.querySelector("#restart-test").addEventListener("click", startProfessionalTest);
reportClose.addEventListener("click", () => reportDialog.close());
reportDialog.addEventListener("click", (event) => {
  if (event.target === reportDialog) reportDialog.close();
});
nextTrialButton.addEventListener("click", () => {
  if (trialFeedback) {
    trialFeedback = null;
    if (professionalTest.phase === "done") {
      renderProfessionalState();
      return;
    }
  }
  startProfessionalTrial();
});
testAnswers.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-answer]");
  if (!button || !trialActive || !professionalTest) return;
  trialActive = false;
  silenceProfessionalTone();
  const phase = professionalTest.phase;
  const judgedFrequency = professionalTest.frequency;
  const result = answerProfessionalTrial(professionalTest, trialSignal, button.dataset.answer);
  trialFeedback = {
    ...result,
    phase,
    frequency: judgedFrequency,
    signal: trialSignal,
    answer: button.dataset.answer,
  };
  if (result.done) {
    saveProfessionalResult();
    destroyProfessionalToneEngine();
  }
  renderProfessionalState();
});

menuItems.forEach((item) => {
  if (["hearing-link", "voice-link", "psychology-link", "vision-link", "certificate-link"].includes(item.id)) return;
  item.addEventListener("click", () => {
    showToast(`${item.dataset.title}功能正在准备中`);
  });
});

slider.addEventListener("input", () => {
  setFrequency(Number(slider.value));
});
setupStepButton(decreaseButton, -1);
setupStepButton(increaseButton, 1);
window.addEventListener("pointerup", (event) => {
  if (event.pointerId === heldPointerId) stopStepping();
});
window.addEventListener("pointercancel", (event) => {
  if (event.pointerId === heldPointerId) stopStepping();
});
window.addEventListener("blur", stopStepping);
window.addEventListener("resize", () => window.requestAnimationFrame(drawVisibleVoiceCharts));
playButton.addEventListener("click", toggleSound);
window.addEventListener("hashchange", showCurrentView);
window.addEventListener("pagehide", () => {
  stopStepping();
  resetProfessionalTest();
  stopVoiceCapture();
});

setFrequency(frequency);
renderRecords();
renderVoiceRecords();
showCurrentView();
