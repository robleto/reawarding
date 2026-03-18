import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import HorizontalScroller from "../components/ui/HorizontalScroller";

const meta: Meta<typeof HorizontalScroller> = {
  title: "UI/HorizontalScroller",
  component: HorizontalScroller,
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
type Story = StoryObj<typeof HorizontalScroller>;

export const Default: Story = {
  args: {
    children: (
      <>
        {Array.from({ length: 12 }).map((_, index) => (
          <div
            key={index}
            className="snap-start w-44 h-60 rounded-xl border border-gray-700 bg-gray-900/70 text-white flex items-center justify-center"
          >
            Card {index + 1}
          </div>
        ))}
      </>
    ),
  },
};

export const NoArrows: Story = {
  args: {
    showArrows: false,
    children: (
      <>
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="snap-start w-52 h-44 rounded-xl border border-gray-700 bg-gray-900/70 text-white flex items-center justify-center"
          >
            Item {index + 1}
          </div>
        ))}
      </>
    ),
  },
};
