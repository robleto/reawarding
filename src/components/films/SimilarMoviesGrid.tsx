import Link from "next/link";
import Image from "next/image";
import { slugifyTitle } from "@/utils/slug";
import { normalizeImageUrl } from "@/utils/imageUrl";

type SimilarItem = {
  id: number;
  title: string;
  cached_thumb_url?: string | null;
  thumb_url?: string | null;
};

interface SimilarMoviesGridProps {
  items: SimilarItem[];
}

export default function SimilarMoviesGrid({ items }: SimilarMoviesGridProps) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
      {items.map((m) => {
        const href = `/films/${slugifyTitle(m.title)}/${m.id}`;
        const thumb = normalizeImageUrl(m.cached_thumb_url || m.thumb_url);
        return (
          <Link key={m.id} href={href} className="group block">
            <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 border border-yellow-500/20">
              {thumb ? (
                <Image src={thumb} alt={m.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full" />
              )}
              <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                <div className="text-[13px] text-gray-100 line-clamp-2">{m.title}</div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
