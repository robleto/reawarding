"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";

interface AddMovieByTmdbModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported?: () => void;
}

function parseTmdbId(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const directId = trimmed.match(/^\d+$/);
  if (directId) return directId[0];

  const urlId = trimmed.match(/movie\/(\d+)/i);
  if (urlId) return urlId[1];

  return null;
}

export default function AddMovieByTmdbModal({ isOpen, onClose, onImported }: AddMovieByTmdbModalProps) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const parsedTmdbId = useMemo(() => parseTmdbId(input), [input]);

  const reset = () => {
    setInput("");
    setStatus("idle");
    setMessage("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleImport = async () => {
    if (!parsedTmdbId) {
      setStatus("error");
      setMessage("Enter a valid TMDB movie ID or TMDB movie URL.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/import-tmdb-movie", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tmdbId: parsedTmdbId }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus("error");
        setMessage(data?.error || "Failed to import movie.");
        return;
      }

      setStatus("success");
      setMessage("Movie imported successfully.");
      onImported?.();
    } catch {
      setStatus("error");
      setMessage("Could not import movie right now.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60" onClick={handleClose}>
      <div
        className="w-full max-w-lg rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-charcoal-900 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Movie by TMDB ID</h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close add movie modal"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Paste a TMDB movie ID (for example: <code>550</code>) or full TMDB movie URL.
          </p>

          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="TMDB ID or URL"
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />

          {message && (
            <div
              className={`text-sm rounded-md px-3 py-2 ${
                status === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {message}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={status === "loading"}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {status === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Import Movie
          </button>
        </div>
      </div>
    </div>
  );
}
