import Link from "next/link";
import { Trophy, History, UserRound, Upload, ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const metadata = {
  title: "Reawarding vs Letterboxd | Reawarding",
  description:
    "An honest, feature-by-feature comparison of Reawarding and Letterboxd — what's the same, where each genuinely wins, and how to bring your ratings over.",
};

const tableRows: { feature: string; letterboxd: string; reawarding: string }[] = [
  { feature: "Owner", letterboxd: "Independent", reawarding: "Independent" },
  { feature: "Price", letterboxd: "Free", reawarding: "Free" },
  { feature: "Rating scale", letterboxd: "★ 0.5–5", reawarding: "1–10" },
  { feature: "Written reviews", letterboxd: "Yes", reawarding: "—" },
  { feature: "Best Picture ballots", letterboxd: "—", reawarding: "Yes — forms automatically at 7+" },
  { feature: "Compare vs. the real Academy", letterboxd: "—", reawarding: "Yes — Alternate Oscar History" },
  { feature: "Guest mode (no account)", letterboxd: "Limited", reawarding: "Full — ballots migrate on signup" },
  { feature: "Import the other's ratings", letterboxd: "—", reawarding: "Yes — paste your Letterboxd export" },
  { feature: "Lists & watchlists", letterboxd: "Yes", reawarding: "Yes" },
  { feature: "Follow / activity feed", letterboxd: "Yes, deep", reawarding: "Yes, lightweight" },
  { feature: "Catalog & community", letterboxd: "Large, 15+ years", reawarding: "Growing" },
];

const reawardingWins: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Trophy,
    title: "A winner every year",
    body: "Letterboxd has no award concept. Films you rate 7+ become contenders automatically, and a ballot forms.",
  },
  {
    icon: History,
    title: "Alternate Oscar History",
    body: "See your picks side-by-side with what the Academy actually chose, year by year.",
  },
  {
    icon: Upload,
    title: "Import that isn't a migration",
    body: "Upload your Letterboxd export — half-star ratings convert to the 1–10 scale automatically (×2). Free, no film limit, safe to re-run, and your Letterboxd account is untouched.",
  },
  {
    icon: UserRound,
    title: "Guest mode is real usage",
    body: "Build ballots with nothing but a browser. Nothing is thrown away when you decide to sign up.",
  },
];

const letterboxdWins: { title: string; body: string }[] = [
  {
    title: "Written reviews",
    body: "Letterboxd's whole culture is built around review writing. Reawarding is rating-first — no review text.",
  },
  {
    title: "Social depth",
    body: "Comments, likes, and a mature follower graph. Reawarding's activity feed is lightweight by design, not the point of the product.",
  },
  {
    title: "Catalog and community size",
    body: "15+ years of data, deep arthouse and festival coverage, and a large active community — that's not something a newer product out-scales quickly.",
  },
  {
    title: "List-making as a genre",
    body: "Ranked lists and roundups are a mature, first-class feature on Letterboxd. Reawarding doesn't try to match that.",
  },
];

const faqs: { q: string; a: string }[] = [
  {
    q: "Do I have to give up my Letterboxd diary?",
    a: "No. Keep logging there if that's already your habit — import brings your ratings over so Reawarding can start turning them into ballots.",
  },
  {
    q: "Will I lose star-rating precision when I import?",
    a: "No. Letterboxd's half-star scale (0.5–5) maps cleanly onto Reawarding's 1–10 scale (×2) — nothing is rounded away.",
  },
  {
    q: "Does Reawarding have written reviews?",
    a: "Not today. It's rating-first and ballot-first, not a review-writing platform — that's a real gap if reviews are why you use Letterboxd.",
  },
  {
    q: "Can I use both at the same time?",
    a: "Yes. Most people keep Letterboxd as their diary and use Reawarding as the awards layer on top of the same taste.",
  },
  {
    q: "Can I re-run the import later?",
    a: "Yes, as often as you like — imports only fill gaps, so a rating you've set in Reawarding is never overwritten and nothing gets duplicated.",
  },
];

export default function ReawardingVsLetterboxdPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <p className="text-xs font-medium tracking-widest uppercase text-gold-500/70 mb-3">
        Comparison
      </p>
      <h1 className="font-unbounded text-3xl md:text-4xl font-semibold text-white mb-4 leading-tight">
        Reawarding vs Letterboxd
      </h1>
      <p className="text-gray-300 text-lg mb-8">
        An honest, feature-by-feature comparison — what&apos;s the same, where each
        genuinely wins, and how to bring your ratings over.
      </p>

      <div className="flex flex-wrap gap-3 mb-12">
        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-xl bg-gradient-to-br from-always-gold-400 to-always-gold-600 text-always-black font-unbounded font-semibold shadow-lg hover:from-always-gold-300 hover:to-always-gold-600 transition-colors"
        >
          Pick a movie you love
        </Link>
        <Link
          href="/import"
          className="inline-block px-6 py-3 rounded-xl border border-gold-500/40 text-gold-400 font-unbounded font-semibold hover:bg-gold-500/10 transition-colors"
        >
          Import from Letterboxd
        </Link>
      </div>

      <div className="space-y-8">
        <section className="bg-gray-900/60 border border-gold-500/20 rounded-xl p-6">
          <h2 className="font-unbounded text-xl font-semibold text-gold-400 mb-3">
            The short version
          </h2>
          <p className="text-gray-300">
            Letterboxd is where most people already log and rate what they watch — a
            diary, reviews, lists, a big community. Reawarding isn&apos;t trying to
            replace that. It starts from the same rating you&apos;d give a film and
            takes it one step further: films rated 7 or higher become contenders, a
            ballot forms for that year, and you crown your own Best Picture winner —
            compared, if you want, against what the Academy actually picked.
          </p>
        </section>

        <section className="bg-gray-900/60 border border-gold-500/20 rounded-xl p-6">
          <h2 className="font-unbounded text-xl font-semibold text-gold-400 mb-4">
            Side-by-side
          </h2>
          <div className="rounded-lg border border-gray-700/60 overflow-hidden">
            <div className="grid grid-cols-[1.2fr_1fr_1fr] bg-gray-800/60 text-xs font-semibold uppercase tracking-wide text-gray-400">
              <div className="px-4 py-2.5">Feature</div>
              <div className="px-4 py-2.5">Letterboxd</div>
              <div className="px-4 py-2.5 text-gold-400">Reawarding</div>
            </div>
            {tableRows.map((row, i) => (
              <div
                key={row.feature}
                className={`grid grid-cols-[1.2fr_1fr_1fr] text-sm ${i % 2 === 0 ? "bg-gray-900/40" : "bg-gray-900/10"}`}
              >
                <div className="px-4 py-3 text-gray-300 border-t border-gray-800">{row.feature}</div>
                <div className="px-4 py-3 text-gray-300 border-t border-gray-800">{row.letterboxd}</div>
                <div className="px-4 py-3 text-white border-t border-gray-800">{row.reawarding}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-gray-900/60 border border-gold-500/20 rounded-xl p-6">
          <h2 className="font-unbounded text-xl font-semibold text-gold-400 mb-4">
            Where Reawarding genuinely wins
          </h2>
          <div className="space-y-4">
            {reawardingWins.map((win) => {
              const Icon = win.icon;
              return (
                <div key={win.title} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-always-gold-500/15 border border-always-gold-500/40 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-always-gold-400" />
                  </div>
                  <p className="text-gray-300 text-sm pt-1">
                    <span className="text-white font-medium">{win.title}.</span> {win.body}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-gray-900/60 border border-gray-700/40 rounded-xl p-6">
          <h2 className="font-unbounded text-xl font-semibold text-white mb-1">
            Where Letterboxd still wins
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            A comparison that pretends the alternative has no advantages isn&apos;t worth reading.
          </p>
          <div className="space-y-4">
            {letterboxdWins.map((win) => (
              <div key={win.title}>
                <h3 className="text-white font-medium text-sm mb-0.5">{win.title}</h3>
                <p className="text-gray-400 text-sm">{win.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-unbounded text-xl font-semibold text-gold-400 mb-4">
            FAQ
          </h2>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.q}
                className="group bg-gray-900/60 border border-gold-500/20 rounded-xl open:border-gold-500/40"
              >
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-5 py-4 text-white font-medium">
                  {faq.q}
                  <ChevronDown className="w-4 h-4 text-gold-400 flex-shrink-0 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className="text-gray-300 text-sm px-5 pb-4 -mt-1">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-12 bg-gray-900/60 border border-gold-500/20 rounded-xl p-8 text-center">
        <h2 className="font-unbounded text-2xl font-semibold text-white mb-2">
          Bring your ratings over.
        </h2>
        <p className="text-gray-300 mb-6">
          Import your Letterboxd export and see your first ballot form.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/import"
            className="inline-block px-6 py-3 rounded-xl bg-gradient-to-br from-always-gold-400 to-always-gold-600 text-always-black font-unbounded font-semibold shadow-lg hover:from-always-gold-300 hover:to-always-gold-600 transition-colors"
          >
            Import from Letterboxd
          </Link>
          <Link
            href="/"
            className="inline-block px-6 py-3 rounded-xl border border-gold-500/40 text-gold-400 font-unbounded font-semibold hover:bg-gold-500/10 transition-colors"
          >
            Start fresh instead
          </Link>
        </div>
      </div>
    </div>
  );
}
