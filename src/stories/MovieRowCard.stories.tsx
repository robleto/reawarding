import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import MovieRowCard from "../components/movie/MovieRowCard";
import type { Movie } from "../types/types";

const movie: Movie = {
  id: 5101,
  title: "The Holdovers",
  release_year: 2023,
  poster_url: "https://image.tmdb.org/t/p/w342/VHmqX4HrGsZxKL4bLhwBPMIyY1.jpg",
  thumb_url: "https://image.tmdb.org/t/p/w342/VHmqX4HrGsZxKL4bLhwBPMIyY1.jpg",
  cached_thumb_url: "https://image.tmdb.org/t/p/w342/VHmqX4HrGsZxKL4bLhwBPMIyY1.jpg",
  created_at: "2024-01-01T00:00:00Z",
  imdb_rating: 7.9,
  rankings: [],
};

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
    movie,
    currentUserId: "story-user",
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
    ranking: 8,
    seenIt: true,
    ratingLabel: "+0.5",
  },
};

export const HotTake: Story = {
  args: {
    ranking: 10,
    seenIt: true,
    showHotTake: true,
  },
};
