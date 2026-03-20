import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import ExpandableYearCard from "../components/home/ExpandableYearCard";
import {
  STORY_USER_ID,
  awards2023WithNominees,
  expandableYear2022Movies,
  expandableYear2023Movies,
  fixtureMovies,
} from "./fixtures";

// ── Shared callback stubs ────────────────────────────────────────────────────

const sharedArgs = {
  currentUserId: STORY_USER_ID,
  onToggle: fn(),
  onUpdateMovieRanking: fn(),
  onCreateAward: fn(),
  onOpenFullExplorer: fn(),
  onMilestoneReached: fn(),
};

// ── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta<typeof ExpandableYearCard> = {
  title: "Home/ExpandableYearCard",
  component: ExpandableYearCard,
  parameters: {
    layout: "padded",
    backgrounds: {
      default: "dark",
      values: [{ name: "dark", value: "#0f1117" }],
    },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ExpandableYearCard>;

// ── Stories ──────────────────────────────────────────────────────────────────

/** Default collapsed state — shows poster, year, leading film title, progress bar. */
export const Collapsed: Story = {
  args: {
    ...sharedArgs,
    year: 2023,
    leader: fixtureMovies.oppenheimer,
    nomineeCount: 5,
    neededForBallot: 5,
    allMovies: expandableYear2023Movies,
    awards: awards2023WithNominees,
    isExpanded: false,
  },
};

/** Expanded state — reveals the horizontal film rail for unrated movies. */
export const Expanded: Story = {
  args: {
    ...sharedArgs,
    year: 2023,
    leader: fixtureMovies.oppenheimer,
    nomineeCount: 5,
    neededForBallot: 5,
    allMovies: expandableYear2023Movies,
    awards: awards2023WithNominees,
    isExpanded: true,
  },
};

/**
 * Year where the user has no nominees yet. The leader prop is still required
 * (it is the highest-rated seen film or a placeholder passed by the parent),
 * but the progress indicator shows 0/10 and the "Start rating" label appears.
 */
export const NoLeader: Story = {
  args: {
    ...sharedArgs,
    year: 2022,
    leader: fixtureMovies.banshees,
    nomineeCount: 0,
    neededForBallot: 10,
    allMovies: expandableYear2022Movies,
    awards: [],
    isExpanded: false,
  },
};
