"use client";

import { useState } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { TMDBImage } from "@/types/types";

interface BackdropGalleryProps {
  images: TMDBImage[];
  className?: string;
}

export default function BackdropGallery({ images, className = "" }: BackdropGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Ensure images is an array with valid data
  if (!images || !Array.isArray(images) || images.length === 0) {
    return null;
  }

  // Filter out invalid images
  const validImages = images.filter(img => img && img.file_path);
  if (validImages.length === 0) {
    return null;
  }

  const displayImages = validImages.slice(0, 6);
  const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/";

  const openLightbox = (index: number) => {
    setSelectedIndex(index);
  };

  const closeLightbox = () => {
    setSelectedIndex(null);
  };

  const goToPrevious = () => {
    if (selectedIndex !== null) {
      setSelectedIndex(selectedIndex === 0 ? validImages.length - 1 : selectedIndex - 1);
    }
  };

  const goToNext = () => {
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex + 1) % validImages.length);
    }
  };

  return (
    <div className={className}>
      {/* Image Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {displayImages.map((image, index) => (
          <button
            key={image.file_path || index}
            onClick={() => openLightbox(index)}
            className="group relative aspect-video rounded-lg overflow-hidden bg-gray-800 border border-yellow-500/20 hover:border-yellow-500/50 transition-all"
          >
            <Image
              src={`${TMDB_IMAGE_BASE}w780${image.file_path}`}
              alt={`Backdrop ${index + 1}`}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              unoptimized
            />
            
            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          </button>
        ))}
      </div>

      {/* Show More Link */}
      {validImages.length > 6 && (
        <div className="mt-4 text-center">
          <span className="text-sm text-gray-400">
            + {validImages.length - 6} more images
          </span>
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Previous Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToPrevious();
            }}
            className="absolute left-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
          >
            <ChevronLeft className="w-8 h-8 text-white" />
          </button>

          {/* Image Container */}
          <div
            className="relative max-w-6xl max-h-[90vh] w-full h-full flex items-center justify-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative w-full h-full">
              <Image
                src={`${TMDB_IMAGE_BASE}original${validImages[selectedIndex].file_path}`}
                alt={`Backdrop ${selectedIndex + 1}`}
                fill
                className="object-contain"
                unoptimized
              />
            </div>

            {/* Image Counter */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-full bg-black/70 text-white text-sm">
              {selectedIndex + 1} / {validImages.length}
            </div>
          </div>

          {/* Next Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            className="absolute right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
          >
            <ChevronRight className="w-8 h-8 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
