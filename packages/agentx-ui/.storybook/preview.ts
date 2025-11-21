import type { Preview } from "@storybook/react";
import "../src/styles/globals.css";
import { LoggerFactory, LogLevel } from "../dev-tools/WebSocketLogger";

// Configure frontend logger to send logs to backend
LoggerFactory.configure({
  wsUrl: "ws://localhost:5201",
  defaultLevel: LogLevel.DEBUG,
});

// Test log
const testLogger = LoggerFactory.getLogger("Storybook");
testLogger.info("Storybook preview loaded");

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: "light",
      values: [
        {
          name: "light",
          value: "#ffffff",
        },
        {
          name: "dark",
          value: "#0f172a",
        },
      ],
    },
  },
};

export default preview;
