"use client";

import { useState, useCallback } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

interface OnboardingIntroProps {
  onComplete: () => void;
  onDismiss: () => void;
}

const SLIDES = [
  {
    headline: "Reawarding lets you reshape movie years around your taste.",
    support:
      "Rate films you\u2019ve seen and build your own version of the awards race.",
  },
  {
    headline: "Start small. Rate a few films from one year.",
    support:
      "You don\u2019t need a full ballot to begin \u2014 just a few movies you know well.",
  },
  {
    headline:
      "As you rate films, a Best Picture race begins to form.",
    support:
      "The more you add, the clearer your version of the year becomes.",
  },
  {
    headline: "There\u2019s no correct answer here.",
    support:
      "This is not about agreeing with the Oscars. It\u2019s about seeing your taste take shape.",
  },
];

export default function OnboardingIntro({
  onComplete,
  onDismiss,
}: OnboardingIntroProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  const isLast = currentSlide === SLIDES.length - 1;

  const advance = useCallback(() => {
    if (isLast) {
      onComplete();
      return;
    }
    setDirection("forward");
    setCurrentSlide((prev) => prev + 1);
  }, [isLast, onComplete]);

  const goBack = useCallback(() => {
    if (currentSlide === 0) return;
    setDirection("back");
    setCurrentSlide((prev) => prev - 1);
  }, [currentSlide]);

  const slide = SLIDES[currentSlide];

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-lg px-6">
        {/* Skip */}
        <button
          type="button"
          onClick={onDismiss}
          className="absolute -top-12 right-0 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Skip intro
        </button>

        <div
          key={currentSlide}
          className={`onboarding-slide onboarding-slide--${direction}`}
        >
          {/* Icon accent */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <Sparkles className="h-8 w-8 text-yellow-400/80" />
              <div className="absolute inset-0 blur-lg bg-yellow-400/20 rounded-full" />
            </div>
          </div>

          {/* Headline */}
          <h2 className="font-unbounded text-2xl sm:text-3xl font-bold text-white text-center leading-tight mb-4">
            {slide.headline}
          </h2>

          {/* Support */}
          <p className="text-base text-gray-400 text-center leading-relaxed max-w-md mx-auto">
            {slide.support}
          </p>
        </div>

        {/* Navigation */}
        <div className="mt-10 flex items-center justify-between">
          {/* Back */}
          <button
            type="button"
            onClick={goBack}
            className={`text-sm text-gray-500 hover:text-gray-300 transition-colors ${
              currentSlide === 0 ? "invisible" : ""
            }`}
          >
            Back
          </button>

          {/* Dots */}
          <div className="flex gap-2">
            {SLIDES.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentSlide
                    ? "w-6 bg-yellow-400"
                    : i < currentSlide
                      ? "w-1.5 bg-yellow-400/40"
                      : "w-1.5 bg-gray-600"
                }`}
              />
            ))}
          </div>

          {/* Forward / CTA */}
          <button
            type="button"
            onClick={advance}
            className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all ${
              isLast
                ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 hover:bg-yellow-500/30"
                : "text-gray-300 hover:text-white"
            }`}
          >
            {isLast ? (
              <>
                Start with a Year
                <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              "Next"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
