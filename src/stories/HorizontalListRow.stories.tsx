import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import HorizontalListRow from "../components/list/HorizontalListRow";
import { storyLists } from "./fixtures";

const meta: Meta<typeof HorizontalListRow> = {
  title: "List/HorizontalListRow",
  component: HorizontalListRow,
  parameters: {
    layout: "fullscreen",
    backgrounds: {
      default: "dark",
      values: [{ name: "dark", value: "#0f1117" }],
    },
  },
  tags: ["autodocs"],
  args: {
    title: "Your Lists",
    lists: storyLists,
    seeAllHref: "/lists",
    onAdd: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof HorizontalListRow>;

export const Default: Story = {};

export const ReadOnly: Story = {
  args: {
    readOnly: true,
    onAdd: undefined,
  },
};

export const CompactShelf: Story = {
  args: {
    title: "Recently updated",
    lists: storyLists.slice(0, 2),
    onAdd: undefined,
  },
};
