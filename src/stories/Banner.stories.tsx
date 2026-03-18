import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Info, Bell } from "lucide-react";
import { fn } from "@storybook/test";
import Banner from "../components/ui/Banner";

const meta: Meta<typeof Banner> = {
  title: "UI/Banner",
  component: Banner,
  parameters: {
    layout: "padded",
    backgrounds: {
      default: "dark",
      values: [{ name: "dark", value: "#0f1117" }],
    },
  },
  tags: ["autodocs"],
  args: {
    icon: Info,
    title: "Heads up",
    message: "Your list recommendations are now personalized from recent ratings.",
    onDismiss: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Banner>;

export const Gold: Story = {
  args: {
    variant: "gold",
    action: { label: "View", onClick: fn() },
  },
};

export const Blue: Story = {
  args: {
    variant: "blue",
    icon: Bell,
    title: "Sync complete",
    message: "Your ratings were synced successfully.",
  },
};
