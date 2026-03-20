import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import ShareButton from "../components/ui/ShareButton";

const meta: Meta<typeof ShareButton> = {
  title: "UI/ShareButton",
  component: ShareButton,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    title: "My Reaward Ballot",
    description: "Check out my winner and nominees.",
    url: "https://example.com/awards/2024",
  },
};

export default meta;
type Story = StoryObj<typeof ShareButton>;

export const Button: Story = {
  args: {
    variant: "button",
  },
};

export const Icon: Story = {
  args: {
    variant: "icon",
  },
};
