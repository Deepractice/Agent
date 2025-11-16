/**
 * Debug test to reproduce custom response issue
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MockDriver } from "~/driver/MockDriver";
import { createAgent } from "~/index";
import type { AssistantMessageEvent } from "@deepractice-ai/agentx-event";

describe("MockDriver Custom Response Debug", () => {
  let driver: MockDriver;
  let receivedEvents: AssistantMessageEvent[] = [];

  beforeEach(() => {
    driver = new MockDriver("test-session", "test-agent");
    receivedEvents = [];
  });

  it("should use custom response when configured", async () => {
    // Pre-configure custom response
    driver.setCustomResponse("Tell me a joke", "Why did the chicken cross the road?");

    console.log("[DEBUG] customResponses Map:", driver["customResponses"]);

    // Create agent with this driver
    const agent = createAgent(driver);

    await agent.initialize();

    // Subscribe to assistant_message events
    agent.react({
      onAssistantMessage(event: AssistantMessageEvent) {
        console.log("[DEBUG] Received assistant message:", event.data.content);
        receivedEvents.push(event);
      },
    });

    // Send message
    console.log("[DEBUG] Sending message: Tell me a joke");
    await agent.send("Tell me a joke");

    // Wait for response
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verify response
    expect(receivedEvents.length).toBeGreaterThan(0);
    const lastEvent = receivedEvents[receivedEvents.length - 1];

    const content =
      typeof lastEvent.data.content === "string"
        ? lastEvent.data.content
        : lastEvent.data.content.map((p: any) => ("text" in p ? p.text : "")).join("");

    console.log("[DEBUG] Final content:", content);
    expect(content).toContain("Why did the chicken cross the road?");
  });
});
