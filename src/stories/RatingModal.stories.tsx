import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import RatingModal from "../components/movie/RatingModal";

const meta: Meta<typeof RatingModal> = {
  title: "Movie/RatingModal",
  component: RatingModal,
  parameters: {
    layout: "fullscreen",
    backgrounds: {
      default: "dark",
      values: [{ name: "dark", value: "#0f1117" }],
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof RatingModal>;

export const Open: Story = {
  args: {
    isOpen: true,
    movieTitle: "Oppenheimer",
    posterUrl: "https://image.tmdb.org/t/p/w342/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    currentRating: 8,
    onRate: fn(),
    onClose: fn(),
  },
};

export const Unrated: Story = {
  args: {
    isOpen: true,
    movieTitle: "Past Lives",
    posterUrl: "",
    currentRating: null,
    onRate: fn(),
    onClose: fn(),
  },
};
