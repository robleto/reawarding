import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import HorizontalListRow from "../components/list/HorizontalListRow";
import {
  privateStoryLists,
  publicStoryLists,
  storyLists,
} from "./fixtures";

function ListsHomeSlice() {
  return (
    <div className="w-full max-w-screen-xl space-y-10">
      <section className="space-y-2">
        <h1 className="font-unbounded text-3xl font-semibold text-white">
          Lists
        </h1>
        <p className="max-w-2xl text-sm text-gray-400">
          Organize favorites, save emerging patterns from your ratings, and keep a clean split between public shelves and private drafts.
        </p>
      </section>

      <HorizontalListRow
        title="My Lists"
        lists={storyLists}
        seeAllHref="/lists/mine"
        onAdd={fn()}
      />

      <HorizontalListRow
        title="Public Lists"
        lists={publicStoryLists}
        seeAllHref="/lists/public"
        readOnly
      />
    </div>
  );
}

function ProfileListsSplitSlice() {
  return (
    <div className="w-full max-w-screen-xl space-y-10">
      <section className="space-y-1">
        <h1 className="font-unbounded text-3xl font-semibold text-white">
          @gregory / lists
        </h1>
        <p className="text-sm text-gray-400">
          Mirrors the public/private split on the profile lists page.
        </p>
      </section>

      <HorizontalListRow
        title="Public Lists"
        lists={publicStoryLists}
        readOnly
      />

      <HorizontalListRow
        title="Private Lists"
        lists={privateStoryLists}
        readOnly
      />
    </div>
  );
}

const meta: Meta = {
  title: "Lists/Slices",
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj;

export const ListsHome: Story = {
  render: () => <ListsHomeSlice />,
};

export const ProfileListsSplit: Story = {
  render: () => <ProfileListsSplitSlice />,
};
