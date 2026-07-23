import Link from "next/link";

export const metadata = {
  title: "Guides | Reawarding",
  description: "Comparisons, positioning, and honest answers for people deciding whether Reawarding is for them.",
};

const guides: { title: string; description: string; href: string }[] = [
  {
    title: "Letterboxd for rewriting the Oscars",
    description: "The same instinct Letterboxd built for logging movies — pointed at award history instead.",
    href: "/guides/letterboxd-for-rewriting-the-oscars",
  },
  {
    title: "Reawarding vs Letterboxd",
    description: "An honest, feature-by-feature comparison — including where Letterboxd still wins.",
    href: "/guides/reawarding-vs-letterboxd",
  },
];

export default function GuidesIndexPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-unbounded text-3xl font-semibold text-gold-400 mb-3">
        Guides
      </h1>
      <p className="text-gray-300 mb-10">
        Comparisons, positioning, and honest answers for people deciding whether Reawarding is for them.
      </p>

      <div className="space-y-4">
        {guides.map((guide) => (
          <Link
            key={guide.href}
            href={guide.href}
            className="block bg-gray-900/60 border border-gold-500/20 rounded-xl p-6 hover:border-gold-500/40 transition-colors"
          >
            <h2 className="font-unbounded text-lg font-semibold text-gold-400 mb-1.5">
              {guide.title}
            </h2>
            <p className="text-gray-300 text-sm">{guide.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
