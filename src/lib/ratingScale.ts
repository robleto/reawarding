export type RatingDefinition = {
  score: number;
  label: string;
  description: string;
};

export const RATING_SCALE: Record<number, RatingDefinition> = {
  1: {
    score: 1,
    label: "Awful",
    description: "Painful to sit through. Would warn people away.",
  },
  2: {
    score: 2,
    label: "So Bad",
    description: "A few redeeming bits, but mostly a slog.",
  },
  3: {
    score: 3,
    label: "Weak",
    description: "Only for completionists or hardcore fans.",
  },
  4: {
    score: 4,
    label: "Meh",
    description: "Moments of life, but mostly forgettable.",
  },
  5: {
    score: 5,
    label: "Just OK",
    description: "Fine background viewing; wouldn’t recommend loudly.",
  },
  6: {
    score: 6,
    label: "Decent",
    description: "Enjoyable with caveats. Glad I watched it once.",
  },
  7: {
    score: 7,
    label: "Good",
    description: "Solid watch. I’d recommend it to genre fans.",
  },
  8: {
    score: 8,
    label: "Great",
    description: "Easy recommendation. I’d happily rewatch.",
  },
  9: {
    score: 9,
    label: "Brilliant",
    description: "Must-watch. Sticks with you long after.",
  },
  10: {
    score: 10,
    label: "All-Timer",
    description: "Personal canon. Changes the bar for everything else.",
  },
};

export function getRatingDefinition(
  score: number | null | undefined,
): RatingDefinition | null {
  if (!score) return null;
  return RATING_SCALE[score] ?? null;
}
