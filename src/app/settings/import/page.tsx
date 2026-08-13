"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Upload, ArrowLeft, CheckCircle, AlertCircle, Film } from "lucide-react";
import { useUser } from "@supabase/auth-helpers-react";
import type { ImportRow, ImportSource, ImportResult } from "@/app/api/import/library/route";

// ── CSV parser ────────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    return Object.fromEntries(
      headers.map((h, i) => [h, (values[i] ?? "").trim()])
    );
  });
}

// ── Row normalizers ───────────────────────────────────────────────────────────

function normalizeLetterboxd(row: Record<string, string>): ImportRow | null {
  const title = row["Name"] ?? row["Title"];
  const yearStr = row["Year"];
  if (!title || !yearStr) return null;
  const year = parseInt(yearStr, 10);
  if (!year) return null;
  const ratingStr = row["Rating"];
  // Letterboxd: 0.5–5 stars → multiply ×2 for 1–10
  const rating = ratingStr ? Math.min(10, Math.round(parseFloat(ratingStr) * 2)) : null;
  // Watchlist rows have no Rating column header at all
  const isWatchlist = !("Rating" in row);
  return { title, year, rating: rating || null, watched: !isWatchlist };
}

function normalizeIMDb(row: Record<string, string>): ImportRow | null {
  const title = row["Title"];
  const yearStr = row["Year"];
  const imdbId = row["Const"];
  if (!title || !yearStr) return null;
  const year = parseInt(yearStr, 10);
  if (!year) return null;
  // IMDb "Your Ratings" export: "Your Rating" column (1–10, direct)
  const ratingStr = row["Your Rating"];
  const rating = ratingStr ? parseInt(ratingStr, 10) : null;
  return {
    title,
    year,
    rating: rating && rating >= 1 && rating <= 10 ? rating : null,
    imdbId: imdbId || undefined,
    watched: true,
  };
}

// ── Source config ─────────────────────────────────────────────────────────────

const SOURCES: {
  id: ImportSource;
  label: string;
  description: string;
  exportInstructions: string;
  acceptedFiles: string;
}[] = [
  {
    id: "letterboxd",
    label: "Letterboxd",
    description: "Import your watched films, ratings, and watchlist",
    exportInstructions:
      "Profile → Settings → Import & Export → Export Your Data. Upload ratings.csv, diary.csv, or watchlist.csv.",
    acceptedFiles: ".csv",
  },
  {
    id: "imdb",
    label: "IMDb",
    description: "Import your IMDb ratings",
    exportInstructions:
      'imdb.com → Your activity → Ratings → "Export" (top right). Upload the ratings CSV.',
    acceptedFiles: ".csv",
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

type Step = "source" | "upload" | "preview" | "done";

export default function ImportPage() {
  const router = useRouter();
  const user = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("source");
  const [source, setSource] = useState<ImportSource | null>(null);
  const [parsedRows, setParsedRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  // Derived counts for preview
  const watchedRows = parsedRows.filter((r) => r.watched);
  const watchlistRows = parsedRows.filter((r) => !r.watched);
  const ratedRows = parsedRows.filter((r) => r.rating !== null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !source) return;
      setParseError(null);
      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        try {
          const rawRows = parseCSV(text);
          if (rawRows.length === 0) {
            setParseError("This file appears to be empty or unrecognised.");
            return;
          }
          const normalize = source === "letterboxd" ? normalizeLetterboxd : normalizeIMDb;
          const rows = rawRows
            .map(normalize)
            .filter((r): r is ImportRow => r !== null);
          if (rows.length === 0) {
            setParseError(
              "No importable rows found. Make sure you're uploading the right file for this source."
            );
            return;
          }
          setParsedRows(rows);
          setStep("preview");
        } catch {
          setParseError("Could not parse this file. Please check it's a valid CSV.");
        }
      };
      reader.readAsText(file);
    },
    [source]
  );

  const handleImport = useCallback(async () => {
    if (!user || parsedRows.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch("/api/import/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsedRows, source }),
      });
      const data = await res.json();
      if (!res.ok) {
        setParseError(data.error ?? "Something went wrong during import. Please try again.");
        return;
      }
      setResult(data as ImportResult);
      setStep("done");
    } catch {
      setParseError("Something went wrong during import. Please try again.");
    } finally {
      setImporting(false);
    }
  }, [user, parsedRows, source]);

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-500 text-sm">Sign in to import your library.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      {/* Back link */}
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-8"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Settings
      </Link>

      <h1 className="text-2xl font-bold font-unbounded text-white mb-1">
        Import your library
      </h1>
      <p className="text-sm text-gray-500 mb-10">
        Bring in ratings and watch history from other services. Existing ratings
        are preserved — imports only fill gaps.
      </p>

      {/* ── Step: source ── */}
      {step === "source" && (
        <div className="space-y-3">
          {SOURCES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setSource(s.id);
                setStep("upload");
              }}
              className="w-full text-left rounded-xl border border-gray-700/40 bg-gray-900/40 px-5 py-4 hover:border-yellow-500/30 hover:bg-gray-900/60 transition-all group"
            >
              <p className="font-semibold text-white group-hover:text-yellow-200 transition-colors">
                {s.label}
              </p>
              <p className="mt-0.5 text-sm text-gray-500">{s.description}</p>
            </button>
          ))}
        </div>
      )}

      {/* ── Step: upload ── */}
      {step === "upload" && source && (
        <div>
          {/* Instructions */}
          {(() => {
            const s = SOURCES.find((s) => s.id === source)!;
            return (
              <div className="mb-6 rounded-xl border border-gray-700/30 bg-gray-900/30 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                  How to export from {s.label}
                </p>
                <p className="text-sm text-gray-300">{s.exportInstructions}</p>
              </div>
            );
          })()}

          {/* Drop zone */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-xl border-2 border-dashed border-gray-700/40 bg-gray-900/20 px-6 py-12 flex flex-col items-center gap-3 hover:border-yellow-500/30 hover:bg-gray-900/40 transition-all group"
          >
            <Upload className="h-8 w-8 text-gray-600 group-hover:text-yellow-400 transition-colors" />
            <span className="text-sm font-medium text-gray-400 group-hover:text-gray-200 transition-colors">
              Click to choose a CSV file
            </span>
            <span className="text-xs text-gray-600">ratings.csv, diary.csv, or watchlist.csv</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />

          {parseError && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
              <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-300">{parseError}</p>
            </div>
          )}

          <button
            type="button"
            onClick={() => { setSource(null); setStep("source"); }}
            className="mt-6 text-sm text-gray-600 hover:text-gray-400 transition-colors"
          >
            ← Choose a different source
          </button>
        </div>
      )}

      {/* ── Step: preview ── */}
      {step === "preview" && (
        <div>
          {/* Summary bar */}
          <div className="mb-6 rounded-xl border border-gray-700/30 bg-gray-900/40 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
              {fileName}
            </p>
            <div className="flex gap-6 flex-wrap">
              <div>
                <p className="text-2xl font-bold text-white">{watchedRows.length}</p>
                <p className="text-xs text-gray-500">Films watched</p>
              </div>
              {ratedRows.length > 0 && (
                <div>
                  <p className="text-2xl font-bold text-white">{ratedRows.length}</p>
                  <p className="text-xs text-gray-500">With ratings</p>
                </div>
              )}
              {watchlistRows.length > 0 && (
                <div>
                  <p className="text-2xl font-bold text-white">{watchlistRows.length}</p>
                  <p className="text-xs text-gray-500">Watchlist only</p>
                </div>
              )}
            </div>
          </div>

          {/* Sample rows */}
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
              Preview (first 8 rows)
            </p>
            <div className="rounded-xl border border-gray-800 overflow-hidden">
              {parsedRows.slice(0, 8).map((row, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-4 px-4 py-2.5 border-b border-gray-800/60 last:border-0 bg-gray-900/30"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Film className="h-3.5 w-3.5 text-gray-600 flex-shrink-0" />
                    <span className="text-sm text-gray-200 truncate">{row.title}</span>
                    <span className="text-xs text-gray-600 flex-shrink-0">{row.year}</span>
                  </div>
                  {row.rating !== null ? (
                    <span className="text-xs font-semibold text-yellow-400 flex-shrink-0">
                      {row.rating}/10
                    </span>
                  ) : row.watched ? (
                    <span className="text-xs text-gray-600 flex-shrink-0">watched</span>
                  ) : (
                    <span className="text-xs text-gray-600 flex-shrink-0">watchlist</span>
                  )}
                </div>
              ))}
            </div>
            {parsedRows.length > 8 && (
              <p className="mt-2 text-xs text-gray-600 text-center">
                + {parsedRows.length - 8} more rows
              </p>
            )}
          </div>

          <p className="text-xs text-gray-600 mb-6">
            Films not in our database will be skipped. Existing ratings are not overwritten.
          </p>

          {parseError && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
              <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-300">{parseError}</p>
            </div>
          )}

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => { setParsedRows([]); setFileName(""); setStep("upload"); }}
              className="text-sm text-gray-600 hover:text-gray-400 transition-colors"
            >
              ← Choose a different file
            </button>
            <button
              type="button"
              onClick={() => void handleImport()}
              disabled={importing}
              className="ml-auto inline-flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-6 py-2.5 text-sm font-medium text-yellow-300 hover:bg-yellow-500/20 transition-all disabled:opacity-50"
            >
              {importing ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-yellow-400/30 border-t-yellow-400 animate-spin" />
                  Importing…
                </>
              ) : (
                `Import ${watchedRows.length} films`
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Step: done ── */}
      {step === "done" && result && (
        <div>
          <div className="mb-8 flex flex-col items-center text-center">
            <CheckCircle className="h-12 w-12 text-yellow-400 mb-4" />
            <h2 className="text-xl font-bold font-unbounded text-white mb-1">
              Import complete
            </h2>
            <p className="text-sm text-gray-500">
              Your library has been updated.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-8 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-700/30 bg-gray-900/40 px-4 py-4 text-center">
              <p className="text-2xl font-bold text-yellow-400">{result.imported}</p>
              <p className="text-xs text-gray-500 mt-0.5">Films imported</p>
            </div>
            {result.skipped > 0 && (
              <div className="rounded-xl border border-gray-700/30 bg-gray-900/40 px-4 py-4 text-center">
                <p className="text-2xl font-bold text-gray-400">{result.skipped}</p>
                <p className="text-xs text-gray-500 mt-0.5">Already in library</p>
              </div>
            )}
            {result.notFound.length > 0 && (
              <div className="rounded-xl border border-gray-700/30 bg-gray-900/40 px-4 py-4 text-center">
                <p className="text-2xl font-bold text-gray-500">{result.notFound.length}</p>
                <p className="text-xs text-gray-500 mt-0.5">Not in our catalog</p>
              </div>
            )}
          </div>

          {result.notFound.length > 0 && (
            <details className="mb-8">
              <summary className="text-xs font-semibold uppercase tracking-wider text-gray-600 cursor-pointer hover:text-gray-400 transition-colors">
                Films not found ({result.notFound.length})
              </summary>
              <div className="mt-3 max-h-48 overflow-y-auto space-y-1">
                {result.notFound.map((title, i) => (
                  <p key={i} className="text-sm text-gray-500 px-1">{title}</p>
                ))}
              </div>
              {!!result.backfillCapped && (
                <p className="mt-3 text-xs text-gray-600">
                  {result.backfillCapped} of these weren&apos;t checked against our catalog source this
                  run — re-import the file to pick up more of them.
                </p>
              )}
            </details>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setStep("source"); setSource(null); setParsedRows([]); setResult(null); setFileName(""); }}
              className="text-sm text-gray-600 hover:text-gray-400 transition-colors"
            >
              Import another file
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="ml-auto inline-flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-6 py-2.5 text-sm font-medium text-yellow-300 hover:bg-yellow-500/20 transition-all"
            >
              Go to homepage
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
