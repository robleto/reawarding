import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import BallotMilestoneOverlay from "../components/home/BallotMilestoneOverlay";

const meta: Meta<typeof BallotMilestoneOverlay> = {
  title: "Home/BallotMilestoneOverlay",
  component: BallotMilestoneOverlay,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Fixed overlay that fires confetti and displays a congratulatory message when a user hits 5 or 10 nominees on their ballot.",
      },
    },
  },
  tags: ["autodocs"],
  args: {
    onClose: fn(),
  },
};
export default meta;

type Story = StoryObj<typeof BallotMilestoneOverlay>;

export const FiveMilestone: Story = {
  args: {
    year: 2024,
    milestone: 5,
    winnerTitle: "Oppenheimer",
  },
};

export const TenMilestone: Story = {
  args: {
    year: 2022,
    milestone: 10,
    winnerTitle: "Everything Everywhere All at Once",
  },
};
