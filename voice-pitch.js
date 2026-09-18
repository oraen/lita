const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function frequencyToNote(hz) {
  if (!Number.isFinite(hz) || hz <= 0) return null;
  const midi = Math.round(69 + 12 * Math.log2(hz / 440));
  return `${NOTES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

export function createPitchRange() {
  return { minimum: null, maximum: null, candidate: null, consecutive: 0 };
}

export function trackPitch(range, hz) {
  if (!Number.isFinite(hz) || hz < 65 || hz > 1600) {
    range.candidate = null;
    range.consecutive = 0;
    return false;
  }
  if (range.candidate !== null && Math.abs(12 * Math.log2(hz / range.candidate)) < 0.7) {
    range.consecutive += 1;
  } else {
    range.consecutive = 1;
  }
  range.candidate = hz;
  if (range.consecutive < 3) return false;
  range.minimum = range.minimum === null ? hz : Math.min(range.minimum, hz);
  range.maximum = range.maximum === null ? hz : Math.max(range.maximum, hz);
  return true;
}
