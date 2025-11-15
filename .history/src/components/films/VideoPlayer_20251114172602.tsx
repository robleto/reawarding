"use client";
import HorizontalScroller from "@/components/ui/HorizontalScroller";

import { useState } from "react";
import { Play, X } from "lucide-react";
import type { TMDBVideo } from "@/types/types";

interface VideoPlayerProps {
  videos: TMDBVideo[];
  className?: string;
}

export default function VideoPlayer({ videos, className = "" }: VideoPlayerProps) {
  const [selectedVideo, setSelectedVideo] = useState<TMDBVideo | null>(null);

  // Ensure videos is an array and has valid data
  if (!videos || !Array.isArray(videos) || videos.length === 0) {
    return null;
  }

  // Filter for YouTube videos and prioritize trailers
  const youtubeVideos = videos.filter(v => v && v.site === "YouTube" && v.key);
  const trailers = youtubeVideos.filter(v => v.type === "Trailer");
  const clips = youtubeVideos.filter(v => v.type === "Clip" || v.type === "Teaser");
  const displayVideos = [...trailers.slice(0, 3), ...clips.slice(0, 2)].slice(0, 5);

  if (displayVideos.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {/* Video Strip (horizontal scroll) */}
      <HorizontalScroller>
        {displayVideos.map((video, index) => {
          if (!video.key) return null;
          
          return (
            <div key={video.key || index} className="flex-shrink-0 w-[280px] sm:w-[360px] snap-start">
              <button
                onClick={() => setSelectedVideo(video)}
                className="group relative aspect-video rounded-lg overflow-hidden bg-gray-800 border border-yellow-500/20 hover:border-yellow-500/50 transition-all w-full"
              >
                {/* YouTube Thumbnail */}
                <img
                  src={`https://img.youtube.com/vi/${video.key}/mqdefault.jpg`}
                  alt={video.name || 'Video thumbnail'}
                  className="w-full h-full object-cover"
                />
                {/* Play Overlay */}
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-yellow-500 group-hover:bg-yellow-400 flex items-center justify-center transition-colors">
                    <Play className="w-6 h-6 text-gray-900 fill-gray-900" />
                  </div>
                </div>
                {/* Video Info */}
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                  <div className="text-sm font-medium text-white line-clamp-1">
                    {video.name || 'Untitled'}
                  </div>
                  <div className="text-xs text-gray-300">
                    {video.type || 'Video'}
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </HorizontalScroller>

      {/* Video Modal */}
      {selectedVideo && selectedVideo.key && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="relative w-full max-w-5xl aspect-video bg-black rounded-lg overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedVideo(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            {/* YouTube Embed */}
            <iframe
              src={`https://www.youtube.com/embed/${selectedVideo.key}?autoplay=1`}
              title={selectedVideo.name || 'Video player'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
