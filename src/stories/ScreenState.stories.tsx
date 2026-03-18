import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import ScreenState from "../components/ui/ScreenState";

const meta: Meta<typeof ScreenState> = {
  title: "UI/ScreenState",
  component: ScreenState,
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
type Story = StoryObj<typeof ScreenState>;

export const Empty: Story = {
  args: {
    title: "No films yet",
    message: "Start by searching and rating a movie to build your first ballot year.",
    primaryAction: { label: "Browse Films", href: "/films" },
    secondaryAction: { label: "Go Home", href: "/" },
  },
};

export const Error: Story = {
  args: {
    tone: "error",
    title: "Could not load data",
    message: "Please try again in a moment or return home.",
    primaryAction: { label: "Retry", href: "/" },
  },
};
