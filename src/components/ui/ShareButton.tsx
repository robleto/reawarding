"use client";

import { useState } from "react";
import { Share2, Check, Copy } from "lucide-react";
import { useGlobalToast } from "@/hooks/useGlobalToast";

interface ShareButtonProps {
  url?: string;
  title?: string;
  description?: string;
  variant?: "button" | "icon";
  className?: string;
}

export default function ShareButton({ 
  url, 
  title = "Check this out!", 
  description,
  variant = "button",
  className = ""
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useGlobalToast();
  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

  const handleShare = async () => {
    // Try native share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // User cancelled or error - fall through to clipboard
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      showToast("Link copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      showToast("Failed to copy link", "error");
    }
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleShare}
        className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${className}`}
        title="Share"
      >
        {copied ? (
          <Check className="w-5 h-5 text-green-500" />
        ) : (
          <Share2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleShare}
      className={`inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium touch-manipulation min-h-[44px] ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4" />
          <span>Share</span>
        </>
      )}
    </button>
  );
}
