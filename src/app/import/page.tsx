import Link from "next/link";
import { Download, Upload, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import LibraryImporter from "@/components/import/LibraryImporter";

export const metadata = {
  title: "Import from Letterboxd | Reawarding",
  description:
    "Bring your Letterboxd ratings into Reawarding and keep your Letterboxd account exactly as it is. Upload the CSV export — every year you've watched starts forming its own Best Picture ballot.",
  // No `url`/`alternates` here on purpose: the root layout sets no
  // metadataBase, so a relative URL in metadata resolves against localhost and
  // Next warns at build time. Title + description are what a shared link
  // actually renders.
  openGraph: {
    title: "Bring your Letterboxd history. Keep your Letterboxd account.",
    description:
      "Reawarding is the awards layer on top of the diary you already keep. Import your ratings once — no password, no account linking, nothing to give up.",
    type: "website",
  },
};

const steps: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Download,
    title: "Export from where you already log",
    body: "Letterboxd → Settings → Import & Export → Export Your Data. IMDb ratings exports work too. Nothing changes on their end — an export is a read.",
  },
  {
    icon: Upload,
    title: "Upload the CSV",
    body: "Letterboxd, IMDb, and TMDB exports are recognised on sight — half-stars convert to the 1–10 scale on their own. Kept your history in your own spreadsheet? Map your columns once and it imports the same way.",
  },
  {
    icon: Trophy,
    title: "Your ballots form themselves",
    body: "Every film you rated 7 or higher becomes a contender for its year. Years you've watched deeply get a Best Picture ballot waiting for a winner.",
  },
];

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      {/* ── The promise ─────────────────────────────────────────────────────
          This route exists to be an entry path, not a settings chore, so the
          pitch is server-rendered above the tool: someone arriving cold from a
          link or a search result reads what they get before being asked for
          anything. The framing is companion, not migration (docs/validation) —
          "keep your Letterboxd account" is the load-bearing half of the
          headline, and every claim under it has to stay true or the route is
          worse than no route. */}
      <p className="text-xs font-medium tracking-widest uppercase text-gold-500/70 mb-3">
        Import
      </p>
      <h1 className="font-unbounded text-3xl md:text-4xl font-semibold text-white mb-4 leading-tight">
        Bring your Letterboxd history.
        <br />
        Keep your Letterboxd account.
      </h1>
      <p className="text-gray-300 text-lg mb-3">
        Reawarding isn&apos;t a replacement for your diary — it&apos;s the awards
        layer on top of it. Import your ratings once and the years you&apos;ve
        watched start turning into your own Best Picture ballots.
      </p>
      <p className="text-sm text-gray-500 mb-10">
        Keep logging wherever you already log. No Letterboxd password, no account
        linking, nothing deleted or moved — just a CSV file you already own.
      </p>

      {/* ── How it works ── */}
      <div className="space-y-4 mb-12">
        {steps.map(({ icon: Icon, title, body }, i) => (
          <div key={title} className="flex items-start gap-4">
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-always-gold-500/15 border border-always-gold-500/40 flex items-center justify-center">
              <Icon className="w-4 h-4 text-always-gold-400" />
            </div>
            <div className="pt-1">
              <p className="text-white font-medium text-sm">
                <span className="text-gold-500/70 mr-1.5">{i + 1}.</span>
                {title}
              </p>
              <p className="text-gray-400 text-sm mt-0.5">{body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── The tool ── */}
      <div className="border-t border-gray-800 pt-10">
        <h2 className="font-unbounded text-xl font-semibold text-white mb-1">
          Start your import
        </h2>
        <p className="text-sm text-gray-500 mb-8">
          Existing ratings are never overwritten — imports only fill gaps, so
          it&apos;s safe to re-run whenever you export again.
        </p>

        <LibraryImporter />
      </div>

      {/* ── The honest small print ─────────────────────────────────────────
          Operational limits (batch size, file size, catalog misses) live in
          the uploader itself, next to the decision they affect. What's left
          here is the thing someone should know *before* they bother
          exporting: what does and doesn't come across. */}
      <div className="mt-12 rounded-xl border border-gray-700/40 bg-gray-900/40 px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
          What comes across
        </p>
        <ul className="space-y-2 text-sm text-gray-400">
          <li>
            <span className="text-gray-300">Ratings, watch history, and watchlists.</span> All of
            it, free — there&apos;s no film limit and no paid tier for importing.
          </li>
          <li>
            <span className="text-gray-300">Written reviews don&apos;t come across.</span>{" "}
            Reawarding is rating-first and has nowhere to put them — if reviews are why you use
            Letterboxd, that&apos;s a reason to keep using it.
          </li>
          <li>
            <span className="text-gray-300">Nothing leaves Reawarding.</span> We never write to
            your Letterboxd or IMDb account — the import reads a file you exported, and that&apos;s
            the whole interaction.
          </li>
        </ul>
      </div>

      <p className="mt-8 text-sm text-gray-500">
        Deciding whether to bother?{" "}
        <Link
          href="/guides/reawarding-vs-letterboxd"
          className="text-gold-400 hover:underline"
        >
          Read the honest comparison
        </Link>{" "}
        — including where Letterboxd still wins.
      </p>
    </div>
  );
}
