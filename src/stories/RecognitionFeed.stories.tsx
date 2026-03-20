import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import RecognitionFeed from "../components/home/RecognitionFeed";
import {
  STORY_USER_ID,
  recognitionRows,
} from "./fixtures";

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
    currentUserId: STORY_USER_ID,
    onUpdate: fn(),
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
    rows: recognitionRows,
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
