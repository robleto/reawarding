import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { List, Search } from "lucide-react";
import ExpandableYearCard from "../components/home/ExpandableYearCard";
import RecognitionFeed from "../components/home/RecognitionFeed";
import Banner from "../components/ui/Banner";
import HorizontalListRow from "../components/list/HorizontalListRow";
import {
  STORY_USER_ID,
  awards2023WithNominees,
  expandableYear2023Movies,
  fixtureMovies,
  recognitionRows,
  storyLists,
} from "./fixtures";

function HomeDashboardBuildingSlice() {
  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-8">
      <section className="max-w-3xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Keep going on 2023
        </p>
        <ExpandableYearCard
          year={2023}
          leader={fixtureMovies.oppenheimer}
          nomineeCount={5}
          neededForBallot={5}
          allMovies={expandableYear2023Movies}
          awards={awards2023WithNominees}
          currentUserId={STORY_USER_ID}
          isExpanded={true}
          onToggle={fn()}
          onUpdateMovieRanking={fn()}
          onCreateAward={fn()}
          onOpenFullExplorer={fn()}
          onMilestoneReached={fn()}
        />
      </section>

      <section className="space-y-2">
        <Banner
          variant="gold"
          icon={List}
          message="You've seen 12 courtroom films — enough for a list."
          action={{ label: "Create list", onClick: fn() }}
          onDismiss={fn()}
        />
        <Banner
          variant="gold"
          icon={List}
          message="1 more science fiction film and you have a list."
          action={{ label: "See films", onClick: fn() }}
          onDismiss={fn()}
        />
      </section>

      <section>
        <RecognitionFeed
          rows={recognitionRows}
          loading={false}
          onSelectMovie={fn()}
          onUpdate={fn()}
          currentUserId={STORY_USER_ID}
        />
      </section>
    </div>
  );
}

function HomeDashboardEstablishedSlice() {
  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-10">
      <section className="max-w-3xl">
        <p className="mb-3 text-sm text-gray-500">Welcome back.</p>
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 rounded-xl border border-yellow-500/30 bg-gray-900/90 px-4 h-14 backdrop-blur-md shadow-[0_12px_32px_rgba(0,0,0,0.25)]">
            <Search className="h-5 w-5 flex-shrink-0 text-yellow-500" />
            <span className="text-base text-gray-500">
              Search for a movie to rate...
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {["2024", "2021", "2017", "2014", "2007"].map((year) => (
              <button
                key={year}
                type="button"
                className="flex-shrink-0 rounded-md border border-gray-700/30 bg-gray-900/40 px-3 py-1.5 font-unbounded text-xs font-semibold text-gray-400 transition-all hover:border-yellow-500/30 hover:text-white"
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-3xl">
        <ExpandableYearCard
          year={2023}
          leader={fixtureMovies.oppenheimer}
          nomineeCount={5}
          neededForBallot={5}
          allMovies={expandableYear2023Movies}
          awards={awards2023WithNominees}
          currentUserId={STORY_USER_ID}
          isExpanded={false}
          onToggle={fn()}
          onUpdateMovieRanking={fn()}
          onCreateAward={fn()}
          onOpenFullExplorer={fn()}
          onMilestoneReached={fn()}
        />
      </section>

      <section className="space-y-2">
        <Banner
          variant="gold"
          icon={List}
          message="You've seen 12 courtroom films — enough for a list."
          action={{ label: "Create list", onClick: fn() }}
          onDismiss={fn()}
        />
      </section>

      <section>
        <HorizontalListRow
          title="Your Lists"
          lists={storyLists}
          seeAllHref="/lists"
          onAdd={fn()}
        />
      </section>
    </div>
  );
}

const meta: Meta = {
  title: "Home/DashboardSlices",
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj;

export const BuildingState: Story = {
  render: () => <HomeDashboardBuildingSlice />,
};

export const EstablishedState: Story = {
  render: () => <HomeDashboardEstablishedSlice />,
};
