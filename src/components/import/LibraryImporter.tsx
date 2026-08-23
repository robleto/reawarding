"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Upload, CheckCircle, AlertCircle, Film, Info, Wand2 } from "lucide-react";
import { useUser } from "@supabase/auth-helpers-react";
import type { ImportRow, ImportResult } from "@/app/api/import/library/route";
import {
  parseDelimited,
  detectFormat,
  buildRows,
  batchRows,
  cell,
  RATING_SCALES,
  IMPORT_BATCH_SIZE,
  MAX_FILE_BYTES,
  MAX_ROWS,
  type ParsedCsv,
  type ColumnMapping,
  type FormatDetection,
  type RatingScale,
} from "@/lib/csvImport";

// ── Result aggregation across batches ─────────────────────────────────────────

const EMPTY_RESULT: ImportResult = {
  imported: 0,
  skipped: 0,
  watchlistAdded: 0,
  notFound: [],
  preservedExisting: 0,
  failed: 0,
  failedToSave: [],
};

/**
 * A whole export is uploaded as a sequence of IMPORT_BATCH_SIZE requests, so
 * the user-facing result is the sum of every batch's result — otherwise the
 * done screen would report only the last 200 films.
 */
function mergeResults(a: ImportResult, b: ImportResult): ImportResult {
  return {
    imported: a.imported + b.imported,
    skipped: a.skipped + b.skipped,
    watchlistAdded: a.watchlistAdded + b.watchlistAdded,
    notFound: [...a.notFound, ...b.notFound],
    notFoundCandidates: { ...(a.notFoundCandidates ?? {}), ...(b.notFoundCandidates ?? {}) },
    preservedExisting: a.preservedExisting + b.preservedExisting,
    failed: a.failed + b.failed,
    failedToSave: [...(a.failedToSave ?? []), ...(b.failedToSave ?? [])],
    backfillCapped: (a.backfillCapped ?? 0) + (b.backfillCapped ?? 0) || undefined,
    batchCapped: (a.batchCapped ?? 0) + (b.batchCapped ?? 0) || undefined,
  };
}

// ── Mapping controls ──────────────────────────────────────────────────────────

const NONE = "__none__";

type MappableColumn = {
  key: "title" | "year" | "rating" | "imdbId" | "tmdbId";
  label: string;
  hint: string;
  required?: boolean;
};

const MAPPABLE_COLUMNS: MappableColumn[] = [
  { key: "title", label: "Film title", hint: "Required", required: true },
  { key: "year", label: "Release year", hint: "Required — a full date works too", required: true },
  { key: "rating", label: "Your rating", hint: "Leave empty to import as watched, unrated" },
  { key: "imdbId", label: "IMDb ID", hint: "Optional — makes matching exact" },
  { key: "tmdbId", label: "TMDB ID", hint: "Optional — the most exact match there is" },
];

function ColumnSelect({
  column,
  mapping,
  parsed,
  onChange,
}: {
  column: MappableColumn;
  mapping: ColumnMapping;
  parsed: ParsedCsv;
  onChange: (header: string | null) => void;
}) {
  const selected = mapping[column.key];
  // Show real values from the chosen column — the fastest way for someone to
  // see that "Name" really is the title and not the director.
  const samples = useMemo(() => {
    if (!selected) return [];
    return parsed.rows
      .slice(0, 40)
      .map((row) => cell(parsed.headers, row, selected))
      .filter(Boolean)
      .slice(0, 3);
  }, [parsed, selected]);

  const missingRequired = column.required && !selected;

  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
      <div className="sm:w-40 sm:flex-shrink-0">
        <p className="text-sm text-gray-300">{column.label}</p>
        <p className="text-xs text-gray-600">{column.hint}</p>
      </div>
      <div className="min-w-0 flex-1">
        <select
          value={selected ?? NONE}
          onChange={(e) => onChange(e.target.value === NONE ? null : e.target.value)}
          aria-label={column.label}
          className={`w-full rounded-lg border bg-gray-900/60 px-3 py-2 text-sm text-white transition-colors focus:outline-none focus:ring-1 focus:ring-gold-500/40 ${
            missingRequired ? "border-amber-500/50" : "border-gray-700/60"
          }`}
        >
          <option value={NONE}>— not in this file —</option>
          {parsed.headers.map((header) => (
            <option key={header} value={header}>
              {header}
            </option>
          ))}
        </select>
        {samples.length > 0 && (
          <p className="mt-1 truncate text-xs text-gray-600">e.g. {samples.join(" · ")}</p>
        )}
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

type Step = "upload" | "map" | "preview" | "done";

/**
 * The upload → map → preview → import flow. Lives apart from its page so the
 * route (`/import`, src/app/import/page.tsx) can own the promise and the
 * metadata as server-rendered markup, and so Settings can link to the same
 * flow rather than hosting a second copy of it.
 *
 * Parsing, format detection, and scale conversion are in src/lib/csvImport.ts.
 * Everything that library guesses is shown in the mapping step before a single
 * row is sent — a silently mis-detected rating scale would rewrite someone's
 * whole history at half or double its real value.
 */
export default function LibraryImporter() {
  const router = useRouter();
  const user = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [detection, setDetection] = useState<FormatDetection | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<ImportResult | null>(null);

  // Recomputed on every mapping change, so the preview always shows what the
  // current mapping would actually import.
  const built = useMemo(
    () => (parsed && mapping ? buildRows(parsed, mapping) : null),
    [parsed, mapping]
  );

  const watchedRows = built?.rows.filter((r) => r.watched) ?? [];
  const watchlistRows = built?.rows.filter((r) => !r.watched) ?? [];
  const ratedRows = built?.rows.filter((r) => r.rating !== null) ?? [];

  const resetFile = () => {
    setParsed(null);
    setDetection(null);
    setMapping(null);
    setFileName("");
    setError(null);
  };

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Clear the input so re-picking the same file after a failure still fires
    // onChange.
    e.target.value = "";
    if (!file) return;

    setError(null);
    setFileName(file.name);

    if (file.size > MAX_FILE_BYTES) {
      setError(
        `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is ${
          MAX_FILE_BYTES / 1024 / 1024
        } MB. Split it in a spreadsheet and upload the halves; both will import.`
      );
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setError("Couldn't read that file. Try re-exporting it.");
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      try {
        const next = parseDelimited(text);
        if (next.headers.length === 0 || next.rows.length === 0) {
          setError("That file has no rows in it — check you exported the right thing.");
          return;
        }
        if (next.rows.length > MAX_ROWS) {
          setError(
            `That file has ${next.rows.length.toLocaleString()} rows — the limit is ${MAX_ROWS.toLocaleString()}. Split it and upload the halves.`
          );
          return;
        }
        const detected = detectFormat(next, file.name);
        setParsed(next);
        setDetection(detected);
        setMapping(detected.mapping);
        setStep("map");
      } catch {
        setError("Couldn't parse that file. It needs to be a CSV (or tab/semicolon separated).");
      }
    };
    reader.readAsText(file);
  }, []);

  const handleImport = useCallback(async () => {
    if (!user || !built || built.rows.length === 0) return;
    setImporting(true);
    setError(null);

    const batches = batchRows(built.rows, IMPORT_BATCH_SIZE);
    setProgress({ done: 0, total: built.rows.length });

    let aggregate = EMPTY_RESULT;
    let sent = 0;

    try {
      for (const batch of batches) {
        const res = await fetch("/api/import/library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: batch, source: detection?.id ?? "custom" }),
        });
        const data = await res.json();
        if (!res.ok) {
          // Partial success is still success — report what landed and say
          // plainly that re-uploading is safe rather than implying a rollback
          // that never happened.
          setResult(sent > 0 ? aggregate : null);
          setError(
            sent > 0
              ? `${data.error ?? "The import failed partway through."} ${sent.toLocaleString()} films were already saved — re-upload the same file to pick up where it stopped. Nothing gets duplicated.`
              : (data.error ?? "Something went wrong during import. Please try again.")
          );
          if (sent > 0) setStep("done");
          return;
        }
        aggregate = mergeResults(aggregate, data as ImportResult);
        sent += batch.length;
        setProgress({ done: sent, total: built.rows.length });
      }
      setResult(aggregate);
      setStep("done");
    } catch {
      setResult(sent > 0 ? aggregate : null);
      setError(
        sent > 0
          ? `The connection dropped partway through. ${sent.toLocaleString()} films were saved — re-upload the same file to finish. Nothing gets duplicated.`
          : "Something went wrong during import. Please try again."
      );
      if (sent > 0) setStep("done");
    } finally {
      setImporting(false);
    }
  }, [user, built, detection]);

  // Signed out: the page above this still makes the whole promise, so this is
  // the one thing left to ask for. Importing writes to a library, which needs
  // somewhere to write to — but the account being asked for is ours, not a
  // Letterboxd credential, and saying so here is the point of the route.
  if (!user) {
    return (
      <div className="rounded-xl border border-gold-500/20 bg-gray-900/60 px-6 py-8 text-center">
        <Upload className="mx-auto h-7 w-7 text-gold-400/80" />
        <p className="mt-4 text-white font-medium">Create a free account to import</p>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-gray-400">
          Your ratings need somewhere to live. That&apos;s the only account involved — Reawarding
          never asks for your Letterboxd login, and nothing about your Letterboxd profile
          changes.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/login?next=%2Fimport"
            className="inline-flex items-center gap-2 rounded-full border border-gold-300/40 bg-gold-500 px-6 py-2.5 text-sm font-medium text-black shadow-lg shadow-gold-500/25 hover:bg-gold-400 hover:shadow-gold-400/35 transition-all"
          >
            Sign up free
          </Link>
          <Link
            href="/login?next=%2Fimport"
            className="inline-flex items-center gap-2 rounded-full border border-gray-600/60 px-6 py-2.5 text-sm font-medium text-gray-300 hover:border-gray-400/60 hover:text-white transition-colors"
          >
            Log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── Step: upload ── */}
      {step === "upload" && (
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-xl border-2 border-dashed border-gray-700/40 bg-gray-900/20 px-6 py-12 flex flex-col items-center gap-3 hover:border-gold-500/30 hover:bg-gray-900/40 transition-all group"
          >
            <Upload className="h-8 w-8 text-gray-600 group-hover:text-gold-400 transition-colors" />
            <span className="text-sm font-medium text-gray-400 group-hover:text-gray-200 transition-colors">
              Choose a CSV file
            </span>
            <span className="text-xs text-gray-600">
              Letterboxd, IMDb, TMDB — or your own spreadsheet
            </span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
            className="hidden"
            onChange={handleFileChange}
          />

          {error && <ErrorNote message={error} />}

          {/* The limits, stated where the decision gets made rather than in a
              FAQ. All of these are technical or catalog facts — there is no
              entitlement limit on import. */}
          <div className="mt-6 rounded-xl border border-gray-700/40 bg-gray-900/30 px-5 py-4">
            <p className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <Info className="h-3.5 w-3.5" />
              What to expect
            </p>
            <ul className="space-y-1.5 text-sm text-gray-400">
              <li>
                <span className="text-gray-300">Free and uncapped.</span> Import your whole
                history — no film limit, and re-import as often as you like.
              </li>
              <li>
                <span className="text-gray-300">Recognised automatically:</span> Letterboxd
                (ratings, diary, watched, watchlist), IMDb, and TMDB exports. Anything else, you
                map the columns yourself in the next step.
              </li>
              <li>
                <span className="text-gray-300">Large files upload in passes</span> of{" "}
                {IMPORT_BATCH_SIZE} films, one after another, automatically — a 2,000-film export
                just takes a couple of minutes. Don&apos;t close the tab while it runs.
              </li>
              <li>
                <span className="text-gray-300">Ratings are converted, not guessed.</span> You see
                the scale we detected — and every column we matched — before anything saves.
              </li>
              <li>
                <span className="text-gray-300">Your existing ratings win.</span> Import only
                fills gaps, so re-running it never overwrites a rating you set here.
              </li>
              <li>
                <span className="text-gray-300">Films missing from our catalog</span> are looked up
                live (up to 75 per pass). Anything still unmatched is listed by name at the end,
                never silently dropped.
              </li>
              <li className="text-gray-500">
                Limits: {MAX_FILE_BYTES / 1024 / 1024} MB and{" "}
                {MAX_ROWS.toLocaleString()} rows per file. Bigger than that, split it in a
                spreadsheet — both halves import fine.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* ── Step: map ── */}
      {step === "map" && parsed && detection && mapping && (
        <div>
          <div
            className={`mb-6 flex items-start gap-3 rounded-xl border px-5 py-4 ${
              detection.recognised
                ? "border-gold-500/25 bg-gold-500/5"
                : "border-gray-700/40 bg-gray-900/40"
            }`}
          >
            <Wand2
              className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                detection.recognised ? "text-gold-400" : "text-gray-500"
              }`}
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">
                {detection.recognised
                  ? `Recognised as a ${detection.label}`
                  : "Unrecognised format — map it yourself"}
              </p>
              <p className="mt-0.5 text-sm text-gray-400">{detection.note}</p>
              <p className="mt-1 truncate text-xs text-gray-600">
                {fileName} · {parsed.rows.length.toLocaleString()} rows ·{" "}
                {parsed.headers.length} columns
              </p>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-gray-700/40 bg-gray-900/30 px-5 py-5">
            {MAPPABLE_COLUMNS.map((column) => (
              <ColumnSelect
                key={column.key}
                column={column}
                mapping={mapping}
                parsed={parsed}
                onChange={(header) => setMapping({ ...mapping, [column.key]: header })}
              />
            ))}

            {/* Rating scale — only meaningful once a rating column is mapped. */}
            {mapping.rating && (
              <div className="flex flex-col gap-1.5 border-t border-gray-800 pt-4 sm:flex-row sm:items-center sm:gap-4">
                <div className="sm:w-40 sm:flex-shrink-0">
                  <p className="text-sm text-gray-300">Rating scale</p>
                  <p className="text-xs text-gray-600">Converted to 1–10</p>
                </div>
                <div className="min-w-0 flex-1">
                  <select
                    value={mapping.ratingScale}
                    aria-label="Rating scale"
                    onChange={(e) =>
                      setMapping({ ...mapping, ratingScale: e.target.value as RatingScale })
                    }
                    className="w-full rounded-lg border border-gray-700/60 bg-gray-900/60 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold-500/40"
                  >
                    {RATING_SCALES.map((scale) => (
                      <option key={scale.id} value={scale.id}>
                        {scale.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-600">
                    {RATING_SCALES.find((s) => s.id === mapping.ratingScale)?.example}
                  </p>
                </div>
              </div>
            )}

            {/* Watched vs. watchlist. Letterboxd's watched.csv and
                watchlist.csv are structurally identical (IMP-2), so no
                heuristic can tell them apart — ask, defaulting to whatever the
                filename suggests. */}
            <div className="flex flex-col gap-2 border-t border-gray-800 pt-4 sm:flex-row sm:items-center sm:gap-4">
              <div className="sm:w-40 sm:flex-shrink-0">
                <p className="text-sm text-gray-300">These rows are</p>
                <p className="text-xs text-gray-600">Guessed from the filename</p>
              </div>
              <div className="flex flex-1 gap-2">
                {(
                  [
                    { value: "watched" as const, label: "Films I've watched" },
                    { value: "watchlist" as const, label: "My watchlist" },
                  ]
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMapping({ ...mapping, treatAs: option.value })}
                    aria-pressed={mapping.treatAs === option.value}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      mapping.treatAs === option.value
                        ? "border-gold-500/40 bg-gold-500/10 text-gold-200"
                        : "border-gray-700/60 text-gray-400 hover:border-gray-600 hover:text-gray-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* A release year is genuinely required — it's what decides which
              award year a film belongs to. Deliberately not auto-filled from a
              "date watched" column: a 1995 film watched in 2019 would land in
              2019's ballot, which is worse than asking. */}
          {!mapping.year && (
            <p className="mt-3 text-xs text-amber-300/80">
              No column here looks like a film&apos;s release year. Pick one above if it&apos;s
              there under another name — a &ldquo;date watched&rdquo; column won&apos;t work,
              since the year decides which award year a film competes in. If your file has no
              release year at all, add one and re-export.
            </p>
          )}

          {mapping.treatAs === "watchlist" && (
            <p className="mt-3 text-xs text-gray-500">
              Watchlist rows go to your watchlist and stay unrated, even if this file has ratings
              in it.
            </p>
          )}

          <div className="mt-6 flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                resetFile();
                setStep("upload");
              }}
              className="text-sm text-gray-600 hover:text-gray-400 transition-colors"
            >
              ← Choose a different file
            </button>
            <button
              type="button"
              onClick={() => setStep("preview")}
              disabled={!mapping.title || !mapping.year}
              className="ml-auto inline-flex items-center gap-2 rounded-full border border-gold-300/40 bg-gold-500 px-6 py-2.5 text-sm font-medium text-black shadow-lg shadow-gold-500/25 hover:bg-gold-400 hover:shadow-gold-400/35 transition-all disabled:opacity-40"
            >
              {!mapping.title || !mapping.year ? "Pick title and year columns" : "Looks right"}
            </button>
          </div>
        </div>
      )}

      {/* ── Step: preview ── */}
      {step === "preview" && built && (
        <div>
          <div className="mb-6 rounded-xl border border-gray-700/30 bg-gray-900/40 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
              {fileName}
            </p>
            <div className="flex gap-6 flex-wrap">
              {watchedRows.length > 0 && (
                <div>
                  <p className="text-2xl font-bold text-white">
                    {watchedRows.length.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">Films watched</p>
                </div>
              )}
              {ratedRows.length > 0 && (
                <div>
                  <p className="text-2xl font-bold text-white">
                    {ratedRows.length.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">With ratings</p>
                </div>
              )}
              {watchlistRows.length > 0 && (
                <div>
                  <p className="text-2xl font-bold text-white">
                    {watchlistRows.length.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">Watchlist</p>
                </div>
              )}
              {built.rows.length > IMPORT_BATCH_SIZE && (
                <div>
                  <p className="text-2xl font-bold text-white">
                    {Math.ceil(built.rows.length / IMPORT_BATCH_SIZE)}
                  </p>
                  <p className="text-xs text-gray-500">Upload passes</p>
                </div>
              )}
            </div>
          </div>

          {/* Everything the mapping dropped, itemised — a row that silently
              vanishes is indistinguishable from a bug. */}
          {(built.issues.noYear > 0 ||
            built.issues.noTitle > 0 ||
            built.issues.nonFilm > 0 ||
            built.issues.duplicates > 0) && (
            <div className="mb-6 rounded-lg border border-gray-700/40 bg-gray-900/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                Not included
              </p>
              <ul className="space-y-1 text-sm text-gray-400">
                {built.issues.noTitle > 0 && (
                  <li>{built.issues.noTitle.toLocaleString()} rows had no title</li>
                )}
                {built.issues.noYear > 0 && (
                  <li>
                    {built.issues.noYear.toLocaleString()} rows had no usable year — a film needs a
                    year to belong to an award year
                  </li>
                )}
                {built.issues.nonFilm > 0 && (
                  <li>
                    {built.issues.nonFilm.toLocaleString()} TV or non-film entries (Reawarding is
                    films only)
                  </li>
                )}
                {built.issues.duplicates > 0 && (
                  <li>
                    {built.issues.duplicates.toLocaleString()} repeat viewings collapsed into one
                    entry each
                  </li>
                )}
              </ul>
            </div>
          )}

          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
              Preview (first 8)
            </p>
            <div className="rounded-xl border border-gray-800 overflow-hidden">
              {built.rows.slice(0, 8).map((row, i) => (
                <PreviewRow key={i} row={row} />
              ))}
            </div>
            {built.rows.length > 8 && (
              <p className="mt-2 text-xs text-gray-600 text-center">
                + {(built.rows.length - 8).toLocaleString()} more
              </p>
            )}
          </div>

          {error && <ErrorNote message={error} />}

          <div className="mt-6 flex items-center gap-4">
            <button
              type="button"
              onClick={() => setStep("map")}
              disabled={importing}
              className="text-sm text-gray-600 hover:text-gray-400 transition-colors disabled:opacity-40"
            >
              ← Change the mapping
            </button>
            <button
              type="button"
              onClick={() => void handleImport()}
              disabled={importing || built.rows.length === 0}
              className="ml-auto inline-flex items-center gap-2 rounded-full border border-gold-300/40 bg-gold-500 px-6 py-2.5 text-sm font-medium text-black shadow-lg shadow-gold-500/25 hover:bg-gold-400 hover:shadow-gold-400/35 transition-all disabled:opacity-50"
            >
              {importing ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                  {progress.total > IMPORT_BATCH_SIZE
                    ? `Importing ${progress.done.toLocaleString()} of ${progress.total.toLocaleString()}…`
                    : `Importing ${progress.total.toLocaleString()} films…`}
                </>
              ) : (
                `Import ${built.rows.length.toLocaleString()} films`
              )}
            </button>
          </div>

          {importing && progress.total > IMPORT_BATCH_SIZE && (
            <div className="mt-4">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
                <div
                  className="h-full rounded-full bg-gold-500 transition-all duration-500"
                  style={{
                    width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-gray-600">
                Uploading in passes of {IMPORT_BATCH_SIZE}. Unmatched titles are looked up live,
                which is the slow part — keep this tab open.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Step: done ── */}
      {step === "done" && result && (
        <div>
          <div className="mb-8 flex flex-col items-center text-center">
            <CheckCircle className="h-12 w-12 text-gold-400 mb-4" />
            <h3 className="text-xl font-bold font-unbounded text-white mb-1">
              {error ? "Import stopped partway" : "Import complete"}
            </h3>
            <p className="text-sm text-gray-500">
              {error ? "Everything below was saved." : "Your library has been updated."}
            </p>
          </div>

          {error && <ErrorNote message={error} />}

          <div className="grid grid-cols-2 gap-3 my-8 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-700/30 bg-gray-900/40 px-4 py-4 text-center">
              <p className="text-2xl font-bold text-gold-400">
                {result.imported.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Films imported</p>
            </div>
            {result.watchlistAdded > 0 && (
              <div className="rounded-xl border border-gray-700/30 bg-gray-900/40 px-4 py-4 text-center">
                <p className="text-2xl font-bold text-gold-400">
                  {result.watchlistAdded.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Added to watchlist</p>
              </div>
            )}
            {result.skipped > 0 && (
              <div className="rounded-xl border border-gray-700/30 bg-gray-900/40 px-4 py-4 text-center">
                <p className="text-2xl font-bold text-gray-400">
                  {result.skipped.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Already in library</p>
              </div>
            )}
            {result.preservedExisting > 0 && (
              <div className="rounded-xl border border-gray-700/30 bg-gray-900/40 px-4 py-4 text-center">
                <p className="text-2xl font-bold text-gray-400">
                  {result.preservedExisting.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Already rated — kept yours</p>
              </div>
            )}
            {result.notFound.length > 0 && (
              <div className="rounded-xl border border-gray-700/30 bg-gray-900/40 px-4 py-4 text-center">
                <p className="text-2xl font-bold text-gray-500">
                  {result.notFound.length.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Not in our catalog</p>
              </div>
            )}
            {result.failed > 0 && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-4 text-center">
                <p className="text-2xl font-bold text-red-400">{result.failed.toLocaleString()}</p>
                <p className="text-xs text-red-300/80 mt-0.5">Failed to save — try re-importing</p>
              </div>
            )}
          </div>

          {result.failed > 0 && (
            <div className="mb-8 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
              <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-red-300">
                  {result.failed} film{result.failed === 1 ? "" : "s"} hit a database error while
                  saving and were not imported — this is different from a duplicate skip. Re-import
                  the same file to retry just these.
                </p>
                {result.failedToSave && result.failedToSave.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs font-semibold uppercase tracking-wider text-red-400/80 cursor-pointer hover:text-red-300 transition-colors">
                      Show films
                    </summary>
                    <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                      {result.failedToSave.map((title, i) => (
                        <p key={i} className="text-sm text-red-300/80 px-1">
                          {title}
                        </p>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>
          )}

          {result.notFound.length > 0 && (
            <details className="mb-8">
              <summary className="text-xs font-semibold uppercase tracking-wider text-gray-600 cursor-pointer hover:text-gray-400 transition-colors">
                Films not found ({result.notFound.length.toLocaleString()})
              </summary>
              <div className="mt-3 max-h-48 overflow-y-auto space-y-1">
                {result.notFound.map((title, i) => (
                  <p key={i} className="text-sm text-gray-500 px-1">
                    {title}
                    {result.notFoundCandidates?.[title] && (
                      <span className="text-gray-600">
                        {" "}
                        — closest match: {result.notFoundCandidates[title].title} (
                        {result.notFoundCandidates[title].year ?? "?"})
                      </span>
                    )}
                  </p>
                ))}
              </div>
              {!!result.backfillCapped && (
                <p className="mt-3 text-xs text-gray-600">
                  {result.backfillCapped.toLocaleString()} of these weren&apos;t checked against our
                  catalog source this run — re-import the file to pick up more of them.
                </p>
              )}
            </details>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                resetFile();
                setResult(null);
                setProgress({ done: 0, total: 0 });
                setStep("upload");
              }}
              className="text-sm text-gray-600 hover:text-gray-400 transition-colors"
            >
              Import another file
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="ml-auto inline-flex items-center gap-2 rounded-full border border-gold-300/40 bg-gold-500 px-6 py-2.5 text-sm font-medium text-black shadow-lg shadow-gold-500/25 hover:bg-gold-400 hover:shadow-gold-400/35 transition-all"
            >
              See your ballots
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Small presentational helpers ──────────────────────────────────────────────

function ErrorNote({ message }: { message: string }) {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
      <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
      <p className="text-sm text-red-300">{message}</p>
    </div>
  );
}

function PreviewRow({ row }: { row: ImportRow }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5 border-b border-gray-800/60 last:border-0 bg-gray-900/30">
      <div className="flex items-center gap-2.5 min-w-0">
        <Film className="h-3.5 w-3.5 text-gray-600 flex-shrink-0" />
        <span className="text-sm text-gray-200 truncate">{row.title}</span>
        <span className="text-xs text-gray-600 flex-shrink-0">{row.year}</span>
      </div>
      {row.rating !== null ? (
        <span className="text-xs font-semibold text-gold-400 flex-shrink-0">{row.rating}/10</span>
      ) : (
        <span className="text-xs text-gray-600 flex-shrink-0">
          {row.watched ? "watched" : "watchlist"}
        </span>
      )}
    </div>
  );
}
