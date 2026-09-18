import test from "node:test";
import assert from "node:assert/strict";
import { PitchDetector } from "pitchy";
import { createPitchRange, frequencyToNote, trackPitch } from "./voice-pitch.js";

test("converts frequencies to western note names and octaves", () => {
  assert.equal(frequencyToNote(440), "A4");
  assert.equal(frequencyToNote(261.63), "C4");
  assert.equal(frequencyToNote(523.25), "C5");
  assert.equal(frequencyToNote(659.25), "E5");
  assert.equal(frequencyToNote(987.77), "B5");
  assert.equal(frequencyToNote(0), null);
  assert.equal(frequencyToNote(NaN), null);
});

test("updates range only after consecutive, stable frames", () => {
  const range = createPitchRange();
  assert.equal(trackPitch(range, 220), false);
  assert.equal(trackPitch(range, 221), false);
  assert.equal(trackPitch(range, 219), true);
  assert.equal(range.minimum, 219);
  assert.equal(trackPitch(range, 900), false);
  assert.equal(range.maximum, 219);
  trackPitch(range, 440);
  trackPitch(range, 441);
  assert.equal(trackPitch(range, 439), true);
  assert.equal(range.maximum, 439);
  trackPitch(range, 20);
  assert.equal(trackPitch(range, 440), false);
  assert.equal(range.minimum, 219);
});

test("detects the fundamental of a voiced-like sine wave", () => {
  const sampleRate = 48000;
  const samples = new Float32Array(4096);
  const detector = PitchDetector.forFloat32Array(samples.length);
  for (const expected of [110, 220, 440]) {
    for (let i = 0; i < samples.length; i += 1) {
      samples[i] = 0.2 * Math.sin(2 * Math.PI * expected * i / sampleRate);
    }
    const [hz, clarity] = detector.findPitch(samples, sampleRate);
    assert.ok(Math.abs(hz - expected) < 2, `${expected} Hz was detected as ${hz} Hz`);
    assert.ok(clarity >= 0.85);
  }
});
