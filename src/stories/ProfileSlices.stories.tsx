import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { ArrowRight } from "lucide-react";
import { fn } from "@storybook/test";
import AwardCard from "../components/home/AwardCard";
import {
  fixtureMovies,
  publicStoryLists,
} from "./fixtures";
import HorizontalListRow from "../components/list/HorizontalListRow";

function ProfileAwardsGallerySlice() {
  const awards = [
    {
      year: 2023,
      winnerTitle: fixtureMovies.oppenheimer.title,
      winnerPoster: fixtureMovies.oppenheimer.poster_url,
      nomineeCount: 5,
    },
    {
      year: 2022,
      winnerTitle: fixtureMovies.eeaao.title,
      winnerPoster: fixtureMovies.eeaao.poster_url,
      nomineeCount: 6,
    },
    {
      year: 2019,
      winnerTitle: fixtureMovies.parasite.title,
      winnerPoster: fixtureMovies.parasite.poster_url,
      nomineeCount: 5,
    },
    {
      year: 1994,
      winnerTitle: "The Shawshank Redemption",
      winnerPoster: "https://image.tmdb.org/t/p/w342/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
      nomineeCount: 6,
    },
  ];

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
        <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory sm:grid sm:grid-cols-4 lg:grid-cols-4 sm:overflow-visible sm:pb-0">
          {awards.map((entry) => (
            <div key={entry.year} className="w-[140px] flex-shrink-0 snap-start sm:w-auto">
              <AwardCard
                year={entry.year}
                winnerTitle={entry.winnerTitle}
                winnerPoster={entry.winnerPoster}
                nomineeCount={entry.nomineeCount}
                onClick={fn()}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProfileListsSlice() {
  return (
    <div className="w-full max-w-screen-xl space-y-10">
      <div className="space-y-1">
        <h1 className="text-3xl font-unbounded font-semibold text-white">
          @gregory
        </h1>
        <p className="text-sm text-gray-400">
          Public-facing profile surfaces should feel editorial, not generic.
        </p>
      </div>
      <ProfileAwardsGallerySlice />
      <HorizontalListRow
        title="Public Lists"
        lists={publicStoryLists}
        readOnly
      />
    </div>
  );
}

const meta: Meta = {
  title: "Profile/Slices",
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj;

export const AwardsGallery: Story = {
  render: () => <ProfileAwardsGallerySlice />,
};

export const ProfileOverview: Story = {
  render: () => <ProfileListsSlice />,
};
