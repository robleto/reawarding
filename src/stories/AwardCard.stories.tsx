import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { ArrowRight } from "lucide-react";
import AwardCard from "../components/home/AwardCard";
import { fixtureMovies } from "./fixtures";

function AwardsShelfFrame({ children }: { children: React.ReactNode }) {
  return (
    <section className="w-full max-w-screen-xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Awards Gallery</h2>
          <p className="text-xs text-gray-500">Best Picture winners by year</p>
        </div>
        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
          Full history <ArrowRight className="h-3 w-3" />
        </span>
      </div>
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory sm:grid sm:grid-cols-4 lg:grid-cols-5 sm:overflow-visible sm:pb-0">
          {children}
        </div>
      </div>
    </section>
  );
}

const meta: Meta<typeof AwardCard> = {
  title: "Home/AwardCard",
  component: AwardCard,
  parameters: {
    layout: "fullscreen",
    backgrounds: {
      default: "dark",
      values: [{ name: "dark", value: "#0b0f16" }],
    },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <AwardsShelfFrame>
        <div className="w-[140px] flex-shrink-0 snap-start sm:w-auto">
          <Story />
        </div>
        <div className="w-[140px] flex-shrink-0 snap-start sm:w-auto">
          <AwardCard
            year={2022}
            winnerTitle="Everything Everywhere All at Once"
            winnerPoster={fixtureMovies.eeaao.poster_url}
            nomineeCount={6}
          />
        </div>
        <div className="w-[140px] flex-shrink-0 snap-start sm:w-auto">
          <AwardCard
            year={2019}
            winnerTitle="Parasite"
            winnerPoster={fixtureMovies.parasite.poster_url}
            nomineeCount={5}
          />
        </div>
      </AwardsShelfFrame>
    ),
  ],
  args: {
    year: 2023,
    winnerTitle: "Oppenheimer",
    winnerPoster: fixtureMovies.oppenheimer.poster_url,
    nomineeCount: 10,
    onClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof AwardCard>;

export const AcademyMatch: Story = {};

export const PersonalUpset: Story = {
  args: {
    year: 1994,
    winnerTitle: "The Shawshank Redemption",
    winnerPoster: "https://image.tmdb.org/t/p/w342/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
    nomineeCount: 6,
  },
};

export const EarlyBallot: Story = {
  args: {
    year: 2023,
    winnerTitle: "The Holdovers",
    winnerPoster: fixtureMovies.holdovers.poster_url,
    nomineeCount: 5,
  },
};
