const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const VOICE_MIN_PITCH = 65;
export const VOICE_MAX_PITCH = 2200;
const REQUIRED_STABLE_FRAMES = 2;
const STABLE_TOLERANCE_SEMITONES = 1.2;

export function frequencyToNote(hz) {
  if (!Number.isFinite(hz) || hz <= 0) return null;
  const midi = Math.round(69 + 12 * Math.log2(hz / 440));
  return `${NOTES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

export function createPitchRange() {
  return { minimum: null, maximum: null, candidate: null, consecutive: 0 };
}

export function trackPitch(range, hz) {
  if (!Number.isFinite(hz) || hz < VOICE_MIN_PITCH || hz > VOICE_MAX_PITCH) {
    range.candidate = null;
    range.consecutive = 0;
    return false;
  }
  if (range.candidate !== null &&
      Math.abs(12 * Math.log2(hz / range.candidate)) < STABLE_TOLERANCE_SEMITONES) {
    range.consecutive += 1;
  } else {
    range.consecutive = 1;
  }
  range.candidate = hz;
  if (range.consecutive < REQUIRED_STABLE_FRAMES) return false;
  range.minimum = range.minimum === null ? hz : Math.min(range.minimum, hz);
  range.maximum = range.maximum === null ? hz : Math.max(range.maximum, hz);
  return true;
}
