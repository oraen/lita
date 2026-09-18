const ANCHOR_FREQUENCIES = [
  10000, 15000, 20000, 25000, 5000, 7500, 12500, 17500, 22500,
  2500, 1000, 500, 100, 20, 10,
];

export function createProfessionalTest() {
  return {
    phase: "low",
    anchorIndex: 0,
    lower: 9,
    upper: null,
    frequency: ANCHOR_FREQUENCIES[0],
    trials: 0,
    streak: 0,
    signalInStreak: false,
    confirmed: 0,
    minimum: null,
    maximum: null,
  };
}

export function chooseProfessionalSignal(test, random = Math.random) {
  if (test.streak === 2 && !test.signalInStreak) return true;
  return random() < 0.5;
}

export function answerProfessionalTrial(test, signal, answer) {
  if (answer !== "yes" && answer !== "no" && answer !== "certain") {
    throw new TypeError("Answer must be yes, no or certain");
  }
  const heard = answer === "yes" || answer === "certain";
  const correct = heard === signal;
  test.trials += 1;

  if (correct) {
    test.streak += 1;
    if (signal) test.signalInStreak = true;
  }

  if (!correct) {
    advanceFrequency(test, false);
  } else if ((answer === "certain" && correct) ||
      (test.streak >= 3 && test.signalInStreak)) {
    advanceFrequency(test, true);
  }

  return { correct, done: test.phase === "done" };
}

function advanceFrequency(test, audible) {
  if (test.phase === "low" && test.upper === null) {
    if (audible) {
      test.upper = test.frequency;
      if (test.upper === 10) startHigh(test);
      else test.frequency = test.upper === 10000
        ? 5000
        : Math.floor((test.lower + test.upper) / 2);
    } else {
      test.anchorIndex += 1;
      if (test.anchorIndex === ANCHOR_FREQUENCIES.length) test.phase = "done";
      else test.frequency = ANCHOR_FREQUENCIES[test.anchorIndex];
    }
  } else if (test.phase === "low") {
    if (audible) test.upper = test.frequency;
    else test.lower = test.frequency;

    if (test.upper - test.lower <= 1) startHigh(test);
    else test.frequency = Math.floor((test.lower + test.upper) / 2);
  } else {
    if (audible) test.lower = test.frequency;
    else test.upper = test.frequency;

    if (test.upper - test.lower <= 1) {
      test.maximum = test.lower;
      test.phase = "done";
    } else {
      test.frequency = Math.floor((test.lower + test.upper) / 2);
    }
  }

  test.confirmed += 1;
  test.trials = 0;
  test.streak = 0;
  test.signalInStreak = false;
}

function startHigh(test) {
  test.minimum = test.upper;
  test.phase = "high";
  test.lower = test.minimum;
  test.upper = 25001;
  test.frequency = test.minimum < 15000
    ? 15000
    : Math.floor((test.lower + test.upper) / 2);
}
