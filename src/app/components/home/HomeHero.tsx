"use client";

import { ChevronDown } from "lucide-react";
import { MOTION } from "@/lib/motion";
import MovieSearchPicker from "@/components/home/MovieSearchPicker";
import { useMotionReveal } from "@/hooks/useMotionReveal";
import type { Movie } from "@/types/types";

const getDelay = (index: number) => `${index * MOTION.staggerMs}ms`;

type HomeHeroProps = {
  reducedMotion: boolean;
  onSelectMovie: (movie: Movie) => void;
  onExploreYear: () => void;
};

export default function HomeHero({
  reducedMotion,
  onSelectMovie,
  onExploreYear,
}: HomeHeroProps) {
  const isVisible = useMotionReveal(reducedMotion);

  return (
		<section
			id="home-hero"
			className="home-hero"
			aria-labelledby="hero-heading"
			data-panel-id="home-hero"
		>
			{/* Decorative bg — clipped inside this wrapper so the dropdown is never affected */}
			<div className="home-hero__bg" aria-hidden="true">
				<div className="home-hero__ambient" />
				<div className="home-hero__grain" />
			</div>

			<div className="home-hero__inner">
				<img
					src="/reawarding-logomark.svg"
					alt="Reawarding"
					width={56}
					height={56}
					className={`mx-auto mb-4 motion-reveal ${
						isVisible ? "motion-reveal--visible" : ""
					}`}
					style={{ transitionDelay: getDelay(0) }}
				/>
				<h1
					id="hero-heading"
					data-testid="home-headline"
					className="home-headline font-unbounded"
				>
					{["Some Years ", "Deserve Another Look."].map(
						(line, index) => (
							<span
								key={line}
								className={`motion-reveal home-headline__line ${
									isVisible ? "motion-reveal--visible" : ""
								}`}
								style={{ transitionDelay: getDelay(index + 1) }}
							>
								{line}
							</span>
						),
					)}
				</h1>

				<p
					className={`mt-0 mb-2 text-base text-center text-white/80 motion-reveal ${
						isVisible ? "motion-reveal--visible" : ""
					}`}
					style={{ transitionDelay: getDelay(3) }}
				>
					Rate movies. Rebuild each year&apos;s nominees. Choose <em>your</em> winner.
				</p>

				<div
					className={`home-hero__search motion-reveal motion-reveal-scale ${
						isVisible ? "motion-reveal--visible" : ""
					}`}
					style={{ transitionDelay: getDelay(4) }}
				>
						<MovieSearchPicker
							onSelect={onSelectMovie}
							placeholder="Search for a film you've watched"
							className="home-search-picker"
						/>
						<p className="home-hero__microcopy">
							No account needed to get started.
						</p>
				</div>
			</div>

			<button
				type="button"
				aria-label="Scroll down to explore more"
				className={`home-scroll-hint motion-reveal ${isVisible ? "motion-reveal--visible" : ""}`}
				style={{ transitionDelay: getDelay(5) }}
				onClick={onExploreYear}
			>
				<ChevronDown
					className="home-scroll-hint__icon"
					aria-hidden="true"
				/>
			</button>
		</section>
  );
}
