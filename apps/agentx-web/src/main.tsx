import ReactDOM from "react-dom/client";
import App from "./App";
import "@deepractice-ai/agentx-ui/globals.css";
import "./index.css";

// Temporarily disabled StrictMode to avoid double agent instances in demo
// import React from "react";
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
