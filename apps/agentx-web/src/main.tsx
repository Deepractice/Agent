import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@deepractice-ai/agentx-ui/globals.css";
import "./index.css";
import { LoggerFactory, LogLevel } from "@deepractice-ai/agentx-logger";

// Enable DEBUG logging in browser
LoggerFactory.configure({
  defaultLevel: LogLevel.DEBUG,
});

console.log("[AgentX] Logger configured with DEBUG level");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
