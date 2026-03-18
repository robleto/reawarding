import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import MoviePosterCard from "../components/movie/MoviePosterCard";
import type { Movie } from "../types/types";

const movie: Movie = {
  id: 5001,
  title: "Dune: Part Two",
  release_year: 2024,
  poster_url: "https://image.tmdb.org/t/p/w342/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg",
  thumb_url: "https://image.tmdb.org/t/p/w342/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg",
  created_at: "2024-01-01T00:00:00Z",
  imdb_rating: 8.5,
  rankings: [],
};

const meta: Meta<typeof MoviePosterCard> = {
  title: "Movie/MoviePosterCard",
  component: MoviePosterCard,
  parameters: {
    layout: "centered",
    backgrounds: {
      default: "dark",
      values: [{ name: "dark", value: "#0f1117" }],
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
type Story = StoryObj<typeof MoviePosterCard>;

export const Default: Story = {};

export const WithRating: Story = {
  args: {
    ranking: 9,
    seenIt: true,
    ratingLabel: "+1.2",
  },
};

export const RatingOnly: Story = {
  args: {
    ranking: 8,
    seenIt: true,
    ratingOnly: true,
    ratingLabel: "+0.8",
  },
};
