import confetti from "canvas-confetti";

/**
 * Trigger an epic multi-stage championship confetti explosion!
 */
export function triggerChampionConfetti() {
  const duration = 3.5 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 70, zIndex: 9999 };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  // 1. Initial big side cannons
  confetti({
    ...defaults,
    particleCount: 80,
    origin: { x: 0.15, y: 0.7 },
    colors: ["#fbbf24", "#34d399", "#60a5fa", "#f43f5e", "#a855f7", "#ffffff"],
  });
  confetti({
    ...defaults,
    particleCount: 80,
    origin: { x: 0.85, y: 0.7 },
    colors: ["#fbbf24", "#34d399", "#60a5fa", "#f43f5e", "#a855f7", "#ffffff"],
  });

  // 2. Continuous fireworks effect
  const interval: any = setInterval(function () {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 40 * (timeLeft / duration);
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.4), y: Math.random() - 0.2 },
      colors: ["#fbbf24", "#10b981", "#38bdf8", "#f59e0b"],
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.6, 0.9), y: Math.random() - 0.2 },
      colors: ["#fbbf24", "#10b981", "#38bdf8", "#f59e0b"],
    });
  }, 250);
}
