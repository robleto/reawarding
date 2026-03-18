import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import RecognitionFeed from "../components/home/RecognitionFeed";
import type { FeedRow } from "../hooks/useRecognitionFeed";
import type { Movie } from "../types/types";

const makeMovie = (overrides: Partial<Movie> & { id: number; title: string; release_year: number }): Movie => ({
  poster_url: "",
  thumb_url: "",
  created_at: "2024-01-01T00:00:00Z",
  rankings: [],
  ...overrides,
});

const awardWinnerFilms: Movie[] = [
  makeMovie({
    id: 1,
    title: "Oppenheimer",
    release_year: 2023,
    cached_poster_url: "https://image.tmdb.org/t/p/w342/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    imdb_rating: 8.3,
  }),
  makeMovie({
    id: 2,
    title: "Everything Everywhere All at Once",
    release_year: 2022,
    cached_poster_url: "https://image.tmdb.org/t/p/w342/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg",
    imdb_rating: 7.8,
  }),
  makeMovie({
    id: 3,
    title: "CODA",
    release_year: 2021,
    cached_poster_url: "https://image.tmdb.org/t/p/w342/BzVjmm8l23rPsijLiNLUzuQtyd.jpg",
    imdb_rating: 7.5,
  }),
  makeMovie({
    id: 4,
    title: "Nomadland",
    release_year: 2020,
    cached_poster_url: "https://image.tmdb.org/t/p/w342/66qhJD2c9Z7i9vfUkx4EPNZE4B3.jpg",
    imdb_rating: 7.3,
  }),
  makeMovie({
    id: 5,
    title: "Parasite",
    release_year: 2019,
    cached_poster_url: "https://image.tmdb.org/t/p/w342/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    imdb_rating: 8.5,
  }),
];

const acclaimedFilms: Movie[] = [
  makeMovie({
    id: 6,
    title: "The Holdovers",
    release_year: 2023,
    cached_poster_url: "https://image.tmdb.org/t/p/w342/VHmqX4HrGsZxKL4bLhwBPMIyY1.jpg",
    imdb_rating: 7.9,
  }),
  makeMovie({
    id: 7,
    title: "Past Lives",
    release_year: 2023,
    cached_poster_url: "https://image.tmdb.org/t/p/w342/k3waqVXSnäi8jQ9PDrFVRsMhUq9.jpg",
    imdb_rating: 7.8,
  }),
  makeMovie({
    id: 8,
    title: "Killers of the Flower Moon",
    release_year: 2023,
    cached_poster_url: "https://image.tmdb.org/t/p/w342/dB6Krk806zeqd0YoiGHOCFaOthz.jpg",
    imdb_rating: 7.6,
  }),
  makeMovie({
    id: 9,
    title: "Poor Things",
    release_year: 2023,
    cached_poster_url: "https://image.tmdb.org/t/p/w342/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg",
    imdb_rating: 7.8,
  }),
  makeMovie({
    id: 10,
    title: "American Fiction",
    release_year: 2023,
    cached_poster_url: "",
    imdb_rating: 7.7,
  }),
];

const mockRows: FeedRow[] = [
  {
    id: "award-winners",
    label: "Award winners",
    films: awardWinnerFilms,
  },
  {
    id: "acclaimed-films",
    label: "Acclaimed films",
    films: acclaimedFilms,
  },
];

const meta: Meta<typeof RecognitionFeed> = {
  title: "Home/RecognitionFeed",
  component: RecognitionFeed,
  parameters: {
    layout: "padded",
    backgrounds: {
      default: "dark",
      values: [{ name: "dark", value: "#111827" }],
    },
  },
  tags: ["autodocs"],
  args: {
    onSelectMovie: fn(),
  },
};
export default meta;

type Story = StoryObj<typeof RecognitionFeed>;

export const Loading: Story = {
  args: {
    rows: [],
    loading: true,
  },
};

export const WithRows: Story = {
  args: {
    rows: mockRows,
    loading: false,
  },
};

export const Empty: Story = {
  args: {
    rows: [],
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          "When rows is an empty array and loading is false, the component renders nothing (returns null). This story documents that intentional behavior.",
      },
    },
  },
};
