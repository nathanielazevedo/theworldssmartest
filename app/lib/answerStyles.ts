// Shared answer identity so the broadcast screen and the player's phone use the
// same color + shape for each option — players map "the red triangle" instantly.
export const ANSWER_STYLES = [
  { bg: "bg-rose-600", ring: "ring-rose-300", shape: "▲", label: "Red" },
  { bg: "bg-sky-600", ring: "ring-sky-300", shape: "◆", label: "Blue" },
  { bg: "bg-amber-500", ring: "ring-amber-200", shape: "●", label: "Yellow" },
  { bg: "bg-emerald-600", ring: "ring-emerald-300", shape: "■", label: "Green" },
] as const;

export function answerStyle(i: number) {
  return ANSWER_STYLES[i % ANSWER_STYLES.length];
}
