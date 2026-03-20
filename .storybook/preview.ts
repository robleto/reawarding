import React from "react";
import type { Preview } from "@storybook/react";
import { StorybookAppFrame } from "./StorybookAppFrame";
import "../src/app/globals.css";

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Global theme for stories",
      toolbar: {
        title: "Theme",
        icon: "mirror",
        items: [
          { value: "dark", title: "Dark" },
          { value: "light", title: "Light" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "dark",
  },
  decorators: [
    (Story, context) =>
      React.createElement(
        StorybookAppFrame,
        {
          theme: context.globals.theme === "light" ? "light" : "dark",
          layout: context.parameters.layout,
        },
        React.createElement(Story)
      ),
  ],
  parameters: {
    backgrounds: {
      default: "dark",
      values: [
        { name: "dark", value: "#0a0a0a" },
        { name: "card", value: "#111111" },
        { name: "light", value: "#f8fafc" },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    options: {
      storySort: {
        order: ["Home", "Movie", "List", "UI"],
      },
    },
  },
};

export default preview;
