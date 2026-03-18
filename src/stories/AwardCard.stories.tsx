import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import AwardCard from "../components/home/AwardCard";

const meta: Meta<typeof AwardCard> = {
  title: "Home/AwardCard",
  component: AwardCard,
  parameters: {
    layout: "padded",
    backgrounds: {
      default: "dark",
      values: [{ name: "dark", value: "#0b0f16" }],
    },
  },
  tags: ["autodocs"],
  args: {
    year: 2023,
    winnerTitle: "Oppenheimer",
    winnerPoster: "https://image.tmdb.org/t/p/w342/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    nomineeCount: 10,
    onClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof AwardCard>;

export const Complete: Story = {};

export const InProgress: Story = {
  args: {
    winnerTitle: "The Holdovers",
    nomineeCount: 5,
  },
};
