"use client";

import Image from "next/image";

// Poster data — 1994 films, matching PanelPremise for narrative continuity
const CHOSEN = {
  title: "The Shawshank Redemption",
  poster: "https://image.tmdb.org/t/p/w342/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
};

const ROW_FILMS = [
  {
    title: "Forrest Gump",
    poster: "https://image.tmdb.org/t/p/w342/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg",
  },
  {
    title: "Pulp Fiction",
    poster: "https://image.tmdb.org/t/p/w342/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
  },
  {
    title: "The Lion King",
    poster: "https://image.tmdb.org/t/p/w342/sKCr78MXSLixwmZ8DyJLrpMsd15.jpg",
  },
];

// The original winner shown dimly in the winner zone at step 3
const WINNER_FILM = ROW_FILMS[0]; // Forrest Gump

type StageVisualProps = {
  activeStep: number;
  reducedMotion: boolean;
};

export default function StageVisual({ activeStep, reducedMotion }: StageVisualProps) {
  // On reduced motion, skip to final state (step 3)
  const step = reducedMotion ? 3 : activeStep;

  return (
    <div
      className={`hiw-stage hiw-stage--step${step}`}
      aria-hidden="true"
    >
      {/* ── Step 3: Winner zone (dimmed original winner above row) ── */}
      <div className="hiw-winner-zone">
        <span className="hiw-winner-zone__label">Official winner · 1994</span>
        <div className="hiw-winner-film">
          <Image
            src={WINNER_FILM.poster}
            alt={WINNER_FILM.title}
            fill
            sizes="64px"
            style={{ objectFit: "cover", objectPosition: "center top" }}
            draggable={false}
          />
        </div>
      </div>

      {/* ── Steps 1–3: Year label above row ─────────────────────── */}
      <span className="hiw-year-label">1994</span>

      {/* ── Step 0: Solo chosen label ────────────────────────────── */}
      <span className="hiw-chosen-label">Chosen movie</span>

      {/* ── Film row: chosen card + row contenders ───────────────── */}
      <div className="hiw-film-row">
        {/* Chosen card — always present, size/position changes per step */}
        <div className="hiw-film-card hiw-film-card--chosen">
          <Image
            src={CHOSEN.poster}
            alt={CHOSEN.title}
            fill
            sizes="120px"
            style={{ objectFit: "cover", objectPosition: "center top" }}
            priority
            draggable={false}
          />
          {/* Step 2–3: Rating badge */}
          <span className="hiw-rating-badge">Your pick</span>
        </div>

        {/* Row contender cards — fade in at step 1 */}
        {ROW_FILMS.map((film) => (
          <div key={film.title} className="hiw-film-card hiw-film-card--row">
            <Image
              src={film.poster}
              alt={film.title}
              fill
              sizes="72px"
              style={{ objectFit: "cover", objectPosition: "center top" }}
              draggable={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
