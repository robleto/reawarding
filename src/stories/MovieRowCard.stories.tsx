import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import MovieRowCard from "../components/movie/MovieRowCard";
import {
  STORY_USER_ID,
  fixtureMovies,
  withUserRanking,
} from "./fixtures";

const meta: Meta<typeof MovieRowCard> = {
  title: "Movie/MovieRowCard",
  component: MovieRowCard,
  parameters: {
    layout: "padded",
    backgrounds: {
      default: "dark",
      values: [{ name: "dark", value: "#111827" }],
    },
  },
  tags: ["autodocs"],
  args: {
    movie: fixtureMovies.holdovers,
    currentUserId: STORY_USER_ID,
    ranking: null,
    seenIt: false,
    onUpdate: fn(),
    onClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof MovieRowCard>;

export const Default: Story = {};

export const WithRating: Story = {
  args: {
    movie: withUserRanking(fixtureMovies.holdovers, 8),
    ranking: 8,
    seenIt: true,
    ratingLabel: "+0.5",
  },
};

export const HotTake: Story = {
  args: {
    movie: withUserRanking(fixtureMovies.holdovers, 10),
    ranking: 10,
    seenIt: true,
    showHotTake: true,
  },
};
