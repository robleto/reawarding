import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import SeenItButton from "../components/movie/SeenItButton";

const meta: Meta<typeof SeenItButton> = {
  title: "Movie/SeenItButton",
  component: SeenItButton,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: {
    onClick: fn(),
    onJustSeen: fn(),
  },
};
export default meta;

type Story = StoryObj<typeof SeenItButton>;

export const Unwatched: Story = {
  args: {
    seenIt: false,
    showText: true,
    size: "md",
    variant: "default",
  },
};

export const Watched: Story = {
  args: {
    seenIt: true,
    showText: true,
    size: "md",
    variant: "default",
  },
};

export const Loading: Story = {
  args: {
    seenIt: false,
    showText: true,
    size: "md",
    variant: "default",
    className: "opacity-50 pointer-events-none",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Simulates a loading/disabled state by reducing opacity. SeenItButton has no built-in loading prop; callers achieve this via className.",
      },
    },
  },
};

export const CompactWatched: Story = {
  args: {
    seenIt: true,
    showText: false,
    size: "sm",
    variant: "compact",
  },
};

export const CompactUnwatched: Story = {
  args: {
    seenIt: false,
    showText: false,
    size: "sm",
    variant: "compact",
  },
};
