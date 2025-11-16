/**
 * Minimal test to verify basic functionality without BDD
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createAgent } from "~/index";
import { MockDriver } from "~/driver/MockDriver";
import { LogLevel, type AgentLogger, type LogContext } from "~/AgentLogger";

class SimpleLogger implements AgentLogger {
  log(level: LogLevel, message: string, ...args: any[]): void {
    // Silent
  }
  debug(message: string, ...args: any[]): void {}
  info(message: string, ...args: any[]): void {}
  warn(message: string, ...args: any[]): void {}
  error(message: string, ...args: any[]): void {}
  withContext(context: LogContext): AgentLogger {
    return this;
  }
}

describe("AgentService Basic Tests", () => {
  let agent: any;

  beforeEach(() => {
    const driver = new MockDriver("test-session", "test-agent");
    const logger = new SimpleLogger();
    agent = createAgent(driver, logger);
  });

  afterEach(async () => {
    if (agent) {
      await agent.destroy();
    }
  });

  it("should create agent", () => {
    expect(agent).toBeDefined();
    expect(agent.id).toBeTruthy();
    expect(agent.sessionId).toBe("test-session");
  });

  it("should initialize agent", async () => {
    await agent.initialize();
    expect(agent.messages).toBeDefined();
    expect(agent.messages.length).toBe(0);
  });

  it("should send message and receive response", async () => {
    await agent.initialize();

    const events: any[] = [];

    agent.react({
      onAssistantMessage(event: any) {
        events.push(event);
      },
    });

    await agent.send("Hello");

    // Wait for events
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(agent.messages.length).toBe(2); // user + assistant
    expect(agent.messages[0].role).toBe("user");
    expect(agent.messages[0].content).toBe("Hello");
    expect(agent.messages[1].role).toBe("assistant");
    expect(events.length).toBeGreaterThan(0);
  }, 10000);

  it("should clear message history", async () => {
    await agent.initialize();

    await agent.send("Hello");
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(agent.messages.length).toBeGreaterThan(0);

    agent.clear();

    expect(agent.messages.length).toBe(0);
  });

  it("should throw error when sending before initialization", async () => {
    await expect(agent.send("Hello")).rejects.toThrow("Agent not initialized");
  });
});
