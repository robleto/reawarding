import Link from "next/link";
import Image from "next/image";
import { slugifyTitle } from "@/utils/slug";
import { normalizeImageUrl } from "@/utils/imageUrl";

type PosterThumbProps = {
  id: string | number;
  title: string;
  imageUrl?: string | null;
};

export default function PosterThumb({ id, title, imageUrl }: PosterThumbProps) {
  const href = `/films/${slugifyTitle(title)}/${id}`;
  const normalized = normalizeImageUrl(imageUrl || undefined);
  // Ensure we have a valid absolute URL or proper relative path
  const isValidUrl = normalized && 
    (normalized.startsWith('http://') || 
     normalized.startsWith('https://') || 
     (normalized.startsWith('/') && normalized.length > 1));
  const src = isValidUrl ? normalized : null;

  return (
    <Link href={href} className="group block">
      <div className="w-full rounded-xl overflow-hidden bg-gray-900/70 border border-yellow-500/20 shadow-lg">
        {src ? (
          <Image
            src={src}
            alt={title}
            width={210}
            height={325}
            className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 40vw, (max-width: 1024px) 20vw, 12vw"
          />
        ) : (
          <div className="w-full h-full bg-gray-800" />
        )}
        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
          <div className="text-[13px] text-gray-100 line-clamp-2">{title}</div>
        </div>
      </div>
    </Link>
  );
}
