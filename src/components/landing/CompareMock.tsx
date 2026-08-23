/**
 * "They said / I said" preview for landing variant B.
 *
 * Academy winners below are factual. The "I said" column and the scores are
 * illustrative mock data standing in for one hypothetical user's ballot — this
 * is a picture of the feature, not a claim about anyone's actual opinions.
 *
 * Follows the compare-tool spec: rotated ink stamp over the row rather than
 * inline text, "Reawarded" (never "Disagreed") when the picks diverge, and no
 * summary count anywhere on the screen.
 */
const ROWS = [
  {
    year: 2024,
    academy: { title: 'Anora', score: 7 },
    mine: { title: 'The Brutalist', score: 9 },
  },
  {
    year: 2023,
    academy: { title: 'Oppenheimer', score: 9 },
    mine: { title: 'Oppenheimer', score: 9 },
  },
  {
    year: 2022,
    academy: { title: 'Everything Everywhere All at Once', score: 8 },
    mine: { title: 'The Banshees of Inisherin', score: 10 },
  },
];

function Poster({ title, score }: { title: string; score: number }) {
  return (
    <div className="relative flex-1">
      <div className="flex aspect-[2/3] flex-col justify-end rounded-md border border-gray-700 bg-gradient-to-b from-gray-800 to-gray-900 p-2.5">
        <p className="text-[11px] font-medium leading-tight text-gray-300">{title}</p>
      </div>
      <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-always-black/75 font-mono text-[11px] font-semibold text-always-gold-500 tabular-nums">
        {score}
      </span>
    </div>
  );
}

export default function CompareMock() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/80 p-5 shadow-2xl shadow-always-black/40">
      <div className="mb-4 flex justify-between px-1 text-[11px] uppercase tracking-[0.18em] text-gray-500">
        <span>They said</span>
        <span>I said</span>
      </div>

      <div className="space-y-6">
        {ROWS.map((row) => {
          const agreed = row.academy.title === row.mine.title;
          return (
            <div key={row.year}>
              <p className="mb-2 text-center font-mono text-[11px] tracking-[0.18em] text-gray-500 tabular-nums">
                {row.year}
              </p>

              <div className="relative flex items-stretch gap-3">
                <Poster title={row.academy.title} score={row.academy.score} />
                <Poster title={row.mine.title} score={row.mine.score} />

                {/* Verdict as a rotated ink stamp across the row, per spec. */}
                <span
                  className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded border-2 px-3 py-1 font-unbounded text-xs font-bold uppercase tracking-widest ${
                    agreed
                      ? 'border-emerald-400/70 text-emerald-300/90'
                      : 'border-gold-400/80 text-gold-300'
                  }`}
                >
                  {agreed ? 'Agreed' : 'Reawarded'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
