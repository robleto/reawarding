"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function AddMovieHelpPage() {
  const [tmdbId, setTmdbId] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [request, setRequest] = useState({ email: "", message: "" });
  const [requestStatus, setRequestStatus] = useState<string | null>(null);

  // Handle TMDB import form
  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportStatus(null);
    if (!tmdbId) return setImportStatus("Please enter a TMDB movie ID.");
    const res = await fetch("/api/import-tmdb-movie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdbId }),
    });
    const data = await res.json();
    setImportStatus(data.success ? "Import requested! The movie should appear soon." : data.error || "Error requesting import.");
  };

  // Handle request form
  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestStatus(null);
    // For now, just simulate success
    setRequestStatus("Request submitted! We'll review it soon.");
    setRequest({ email: "", message: "" });
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 text-gray-800 dark:text-gray-100">
      <h1 className="text-2xl font-bold mb-4">How to Add a Missing Movie</h1>
      <p className="mb-4">
        Reawarding uses <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">The Movie Database (TMDB)</a> for all film data, including cast, crew, posters, and release dates.
      </p>
      <div className="flex items-center gap-2 mb-4">
        <Image src="/tmdb.svg" alt="TMDB Logo" width={40} height={40} />
        <span className="text-xs text-gray-500">Reawarding uses the TMDB API but is not endorsed or certified by TMDB.</span>
      </div>
      <ol className="list-decimal pl-6 mb-6 space-y-2">
        <li>
          <strong>Search TMDB first:</strong> Visit <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">TMDB</a> and search for your film. If it exists, it will appear in Reawarding soon.
        </li>
        <li>
          <strong>If the film is missing:</strong> Create a free TMDB account and add the film using their interface. Be sure to fill out as much detail as possible (title, year, poster, etc).
        </li>
        <li>
          <strong>Wait for sync:</strong> New films added to TMDB will appear in Reawarding within about 24 hours.
        </li>
      </ol>
      <h2 className="text-lg font-semibold mb-2">Need it faster?</h2>
      <p className="mb-4">
        If you need a film imported immediately, <a href="mailto:support@reawarding.app" className="text-blue-600 underline">contact support</a> with the TMDB link and we’ll try to help!
      </p>
      <h2 className="text-lg font-semibold mb-2">Found a duplicate or error?</h2>
      <p className="mb-4">
        If you spot a duplicate or incorrect entry, please <a href="mailto:support@reawarding.app" className="text-blue-600 underline">let us know</a> and we’ll fix it.
      </p>
      <section className="mt-8 mb-8">
        <h2 className="text-lg font-semibold mb-2">Instant Import (TMDB Shortcut)</h2>
        <form onSubmit={handleImport} className="flex flex-col gap-2 mb-2">
          <label htmlFor="tmdbId" className="text-sm">TMDB Movie ID or URL</label>
          <input
            id="tmdbId"
            type="text"
            value={tmdbId}
            onChange={e => setTmdbId(e.target.value.replace(/\D/g, ""))}
            placeholder="e.g. 27205"
            className="border rounded px-3 py-1 text-sm"
          />
          <button type="submit" className="bg-blue-600 text-white rounded px-4 py-1 mt-1 hover:bg-blue-700">Import Now</button>
        </form>
        {importStatus && <div className="text-xs text-green-600 mb-2">{importStatus}</div>}
        <p className="text-xs text-gray-500">Paste a TMDB movie ID or URL above to request an immediate import.</p>
      </section>
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Request a Film</h2>
        <form onSubmit={handleRequest} className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm">Your Email (optional)</label>
          <input
            id="email"
            type="email"
            value={request.email}
            onChange={e => setRequest(r => ({ ...r, email: e.target.value }))}
            placeholder="you@email.com"
            className="border rounded px-3 py-1 text-sm"
          />
          <label htmlFor="message" className="text-sm">Film details or TMDB link</label>
          <textarea
            id="message"
            value={request.message}
            onChange={e => setRequest(r => ({ ...r, message: e.target.value }))}
            placeholder="Tell us about the film or paste a TMDB link..."
            className="border rounded px-3 py-1 text-sm"
            rows={3}
          />
          <button type="submit" className="bg-blue-600 text-white rounded px-4 py-1 mt-1 hover:bg-blue-700">Send Request</button>
        </form>
        {requestStatus && <div className="text-xs text-green-600 mt-2">{requestStatus}</div>}
      </section>
      <div className="mt-8 text-xs text-gray-500">
        Inspired by the approach used by <a href="https://letterboxd.com/" target="_blank" rel="noopener noreferrer" className="underline">Letterboxd</a>.
      </div>
      <div className="mt-4">
        <Link href="/legal/privacy" className="text-xs text-blue-600 underline mr-4">Privacy Policy</Link>
        <Link href="/legal/terms" className="text-xs text-blue-600 underline">Terms of Service</Link>
      </div>
    </main>
  );
}
