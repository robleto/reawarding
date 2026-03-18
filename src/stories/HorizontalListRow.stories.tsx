import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import HorizontalListRow from "../components/list/HorizontalListRow";

const lists = [
  {
    id: "list-1",
    user_id: "story-user",
    name: "Neo-Noir Essentials",
    description: "Moody thrillers and detective classics.",
    is_public: true,
    updated_at: "2026-03-16T10:00:00Z",
    movie_count: 12,
    posterUrls: [
      "https://image.tmdb.org/t/p/w342/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
      "https://image.tmdb.org/t/p/w342/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg",
    ],
  },
  {
    id: "list-2",
    user_id: "story-user",
    name: "Oscar Upsets",
    description: "Surprising picks and controversial winners.",
    is_public: false,
    updated_at: "2026-03-10T12:30:00Z",
    movie_count: 9,
    posterUrls: ["https://image.tmdb.org/t/p/w342/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg"],
  },
];

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
    lists,
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
