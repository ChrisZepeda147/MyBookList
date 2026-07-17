import type { Options } from "canvas-confetti";

const CONFETTI_Z_INDEX = 9999;

type ConfettiFn = (options?: Options) => void;

let confettiLoader: Promise<ConfettiFn> | null = null;

function loadConfetti(): Promise<ConfettiFn> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Confetti is client-only"));
  }
  if (!confettiLoader) {
    confettiLoader = import("canvas-confetti").then(
      (module) => module.default as ConfettiFn,
    );
  }
  return confettiLoader;
}

function baseOptions(overrides: Options = {}): Options {
  return {
    zIndex: CONFETTI_Z_INDEX,
    disableForReducedMotion: true,
    ...overrides,
  };
}

/** Classic multi-colored burst for a saved session or routine finish. */
export async function celebrateSessionSaved(streak: number): Promise<void> {
  const confetti = await loadConfetti();
  if (streak >= 7) {
    await celebrateStreakGold(confetti);
    return;
  }
  confetti(
    baseOptions({
      particleCount: 90,
      spread: 72,
      startVelocity: 42,
      origin: { x: 0.5, y: 0.62 },
      colors: ["#26ccff", "#a25afd", "#ff5e7e", "#88ff5a", "#fcff42", "#ffa62d"],
    }),
  );
}

/** Quick burst when a live timer crosses Gold / Red / Diamond. */
export async function celebrateStarMilestone(
  tier: "gold" | "red" | "diamond",
): Promise<void> {
  const confetti = await loadConfetti();
  const colors =
    tier === "gold"
      ? ["#FFD700", "#FFC125", "#FFEC8B", "#DAA520"]
      : tier === "red"
        ? ["#ef4444", "#f87171", "#dc2626", "#fecaca"]
        : ["#67e8f9", "#38bdf8", "#e0f2fe", "#a5f3fc", "#ffffff"];

  confetti(
    baseOptions({
      particleCount: tier === "diamond" ? 120 : 80,
      spread: tier === "diamond" ? 86 : 68,
      startVelocity: 46,
      origin: { x: 0.5, y: 0.55 },
      colors,
      scalar: tier === "diamond" ? 1.15 : 1,
    }),
  );

  if (tier === "diamond") {
    window.setTimeout(() => {
      confetti(
        baseOptions({
          particleCount: 40,
          spread: 100,
          startVelocity: 28,
          origin: { x: 0.5, y: 0.45 },
          colors,
        }),
      );
    }, 220);
  }
}

async function celebrateStreakGold(confetti: ConfettiFn): Promise<void> {
  const gold = ["#FFD700", "#FFC125", "#FFEC8B", "#DAA520", "#FFF8DC"];
  const duration = 2200;
  const end = Date.now() + duration;

  const frame = () => {
    confetti(
      baseOptions({
        particleCount: 4,
        angle: 90,
        spread: 42,
        startVelocity: 18,
        gravity: 0.9,
        drift: 0.4,
        ticks: 320,
        scalar: 1.15,
        shapes: ["circle"],
        colors: gold,
        origin: { x: Math.random() * 0.4 + 0.3, y: 0 },
      }),
    );

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  frame();
}

/** Massive double-cannon blast when a book is marked completed. */
export async function celebrateBookCompleted(): Promise<void> {
  const confetti = await loadConfetti();
  const colors = [
    "#ff4d6d",
    "#ffbe0b",
    "#3a86ff",
    "#06d6a0",
    "#8338ec",
    "#fb5607",
    "#ff006e",
  ];

  function fireCannon(originX: number, angle: number) {
    confetti(
      baseOptions({
        particleCount: 130,
        angle,
        spread: 58,
        startVelocity: 58,
        decay: 0.9,
        gravity: 0.95,
        ticks: 260,
        origin: { x: originX, y: 0.68 },
        colors,
      }),
    );
  }

  fireCannon(0.02, 62);
  fireCannon(0.98, 118);

  window.setTimeout(() => {
    fireCannon(0.08, 56);
    fireCannon(0.92, 124);
    confetti(
      baseOptions({
        particleCount: 80,
        spread: 100,
        startVelocity: 38,
        origin: { x: 0.5, y: 0.55 },
        colors,
      }),
    );
  }, 380);
}
