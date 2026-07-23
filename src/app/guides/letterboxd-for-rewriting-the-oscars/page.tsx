import Link from "next/link";
import { Trophy, History, RefreshCw, UserRound, ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const metadata = {
  title: "Letterboxd for Rewriting the Oscars | Reawarding",
  description:
    "Reawarding takes the same instinct Letterboxd built for logging movies — rating what you watch — and turns it into your own alternate Best Picture history.",
};

const comparisonRows: { letterboxd: string; reawarding: string }[] = [
  { letterboxd: "You rate what you watch", reawarding: "You rate what you watch" },
  { letterboxd: "Ratings build a diary", reawarding: "Ratings build a ballot" },
  { letterboxd: "Your taste, logged", reawarding: "Your taste, crowned" },
];

const steps: { label: string; title: string; body: string }[] = [
  {
    label: "1",
    title: "Watch",
    body: "Mark a film as seen. No review required.",
  },
  {
    label: "2",
    title: "Rate",
    body: "Score it 1–10. That's the whole judgment.",
  },
  {
    label: "3",
    title: "ReAward",
    body: "Rate it 7+ and it's a contender. A few more from the same year, and a ballot forms — pick your Best Picture winner.",
  },
];

const perks: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Trophy,
    title: "A winner every year",
    body: "Not just a list of scores — a Best Picture for every year you've rated.",
  },
  {
    icon: History,
    title: "Alternate Oscar History",
    body: "Seen side-by-side with what the Academy actually picked.",
  },
  {
    icon: RefreshCw,
    title: "Nothing is ever final",
    body: "Re-crown a winner any time your opinion changes.",
  },
  {
    icon: UserRound,
    title: "No account required",
    body: "Guest mode: try the whole loop before signing up.",
  },
];

const faqs: { q: string; a: string }[] = [
  {
    q: "Do I need to log every movie I've ever seen?",
    a: "No. Reawarding isn't a completion project — a single rated film is enough to start a contender. Partial history is valid history.",
  },
  {
    q: "Is this instead of Letterboxd, or alongside it?",
    a: "Most people keep using whatever they already use to log movies. Reawarding isn't trying to replace your diary — it's what happens after you've already decided how you feel about a film.",
  },
  {
    q: "Can I change a winner later?",
    a: "Always. Awards are living — as you rate more films or your opinion shifts, the ballot and the winner move with it.",
  },
  {
    q: "Do I need an account to try it?",
    a: "No. Guest mode lets you watch, rate, and build a ballot with nothing but a browser. If you decide to keep it, your picks move with you when you sign up.",
  },
];

export default function LetterboxdForRewritingTheOscarsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <p className="text-xs font-medium tracking-widest uppercase text-gold-500/70 mb-3">
        Positioning
      </p>
      <h1 className="font-unbounded text-3xl md:text-4xl font-semibold text-white mb-4 leading-tight">
        Letterboxd for rewriting the Oscars
      </h1>
      <p className="text-gray-300 text-lg mb-8">
        You already know how satisfying it is to rate a movie. Reawarding takes that
        instinct one step further — your ratings crown a Best Picture winner, your way.
      </p>

      <Link
        href="/"
        className="inline-block px-6 py-3 rounded-xl bg-gradient-to-br from-always-gold-400 to-always-gold-600 text-always-black font-unbounded font-semibold shadow-lg hover:from-always-gold-300 hover:to-always-gold-600 transition-colors mb-12"
      >
        Pick a movie you love
      </Link>

      <div className="space-y-8">
        <section className="bg-gray-900/60 border border-gold-500/20 rounded-xl p-6">
          <h2 className="font-unbounded text-xl font-semibold text-gold-400 mb-3">
            The same instinct, one more step
          </h2>
          <p className="text-gray-300">
            On Letterboxd, rating a film is the whole point — a quick, expressive
            judgment. Reawarding starts from that same place. You watch something, you
            rate it 1–10. The difference is what happens next: films you rate 7 or
            higher automatically become contenders for their year&apos;s Best Picture.
            Rate a few more from the same year, and a ballot forms in front of you.
            Crown a winner, and you&apos;ve written your own alternate Oscar history for
            that year — sitting right next to what the Academy actually chose.
          </p>
        </section>

        <section className="bg-gray-900/60 border border-gold-500/20 rounded-xl p-6">
          <h2 className="font-unbounded text-xl font-semibold text-gold-400 mb-4">
            What's the same, what's different
          </h2>
          <div className="rounded-lg border border-gray-700/60 overflow-hidden">
            <div className="grid grid-cols-2 bg-gray-800/60 text-xs font-semibold uppercase tracking-wide text-gray-400">
              <div className="px-4 py-2.5">Letterboxd</div>
              <div className="px-4 py-2.5 text-gold-400">Reawarding</div>
            </div>
            {comparisonRows.map((row, i) => (
              <div
                key={row.reawarding}
                className={`grid grid-cols-2 text-sm ${i % 2 === 0 ? "bg-gray-900/40" : "bg-gray-900/10"}`}
              >
                <div className="px-4 py-3 text-gray-300 border-t border-gray-800">{row.letterboxd}</div>
                <div className="px-4 py-3 text-white border-t border-gray-800">{row.reawarding}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-gray-900/60 border border-gold-500/20 rounded-xl p-6">
          <h2 className="font-unbounded text-xl font-semibold text-gold-400 mb-5">
            How Reawarding works
          </h2>
          <div className="space-y-5">
            {steps.map((step) => (
              <div key={step.label} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-always-gold-500/15 border border-always-gold-500/40 flex items-center justify-center font-mono text-sm text-always-gold-400 font-semibold">
                  {step.label}
                </div>
                <div>
                  <h3 className="font-unbounded text-base font-semibold text-white mb-0.5">
                    {step.title}
                  </h3>
                  <p className="text-gray-300 text-sm">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-gray-900/60 border border-gold-500/20 rounded-xl p-6">
          <h2 className="font-unbounded text-xl font-semibold text-gold-400 mb-4">
            What you get that a diary doesn't
          </h2>
          <div className="space-y-4">
            {perks.map((perk) => {
              const Icon = perk.icon;
              return (
                <div key={perk.title} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-always-gold-500/15 border border-always-gold-500/40 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-always-gold-400" />
                  </div>
                  <p className="text-gray-300 text-sm pt-1">
                    <span className="text-white font-medium">{perk.title}.</span> {perk.body}
                  </p>
                </div>
              );
            })}
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
          Pick a movie you love.
        </h2>
        <p className="text-gray-300 mb-6">
          See how fast an opinion turns into an award.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-xl bg-gradient-to-br from-always-gold-400 to-always-gold-600 text-always-black font-unbounded font-semibold shadow-lg hover:from-always-gold-300 hover:to-always-gold-600 transition-colors"
        >
          Get started
        </Link>
      </div>
    </div>
  );
}
