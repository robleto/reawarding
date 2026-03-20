import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Bell, List } from "lucide-react";
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
    icon: List,
    message: "You've seen 12 courtroom films — enough for a list.",
    onDismiss: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Banner>;

export const Gold: Story = {
  args: {
    variant: "gold",
    action: { label: "Create list", onClick: fn() },
  },
  parameters: {
    docs: {
      description: {
        story: "Matches the smart-list alert state used on the homepage when a viewer has crossed a ready-made list threshold.",
      },
    },
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

export const NearMissAlert: Story = {
  args: {
    variant: "gold",
    icon: List,
    message: "1 more science fiction film and you have a list.",
    action: { label: "See films", onClick: fn() },
  },
};
