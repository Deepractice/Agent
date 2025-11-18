/**
 * Type test for Agent-as-Driver pattern
 *
 * This file verifies that AgentInstance can be used as a Driver in TypeScript.
 * It should compile without errors.
 */

import { createAgent, createDriver, type AgentInstance } from "./facade";
import type { AgentDriver } from "./interfaces/AgentDriver";

// Create a mock driver
const mockDriver = createDriver({
  sessionId: "mock-session",
  async *generate(message, builder) {
    yield* builder.text("Mock response");
  }
});

// Create an agent
const agent: AgentInstance = createAgent("test-agent", mockDriver);

// ✅ Test 1: AgentInstance should be assignable to AgentDriver
const driver: AgentDriver = agent;
console.log("✅ Test 1 passed: agent can be assigned to AgentDriver");

// ✅ Test 2: AgentInstance should have AgentDriver methods
const sessionId: string = agent.sessionId;
const driverSessionId: string | null = agent.driverSessionId;
console.log("✅ Test 2 passed: agent has sessionId and driverSessionId");

// ✅ Test 3: AgentInstance.sendMessage should exist and have correct type
const sendMessage: (msg: any) => AsyncIterable<any> = agent.sendMessage;
console.log("✅ Test 3 passed: agent.sendMessage exists");

// ✅ Test 4: AgentInstance.abort should exist
const abort: () => void = agent.abort;
console.log("✅ Test 4 passed: agent.abort exists");

// ✅ Test 5: AgentInstance.destroy should exist
const destroy: () => Promise<void> = agent.destroy;
console.log("✅ Test 5 passed: agent.destroy exists");

// ✅ Test 6: Agent can be used as Driver in createAgent
const outerAgent = createAgent("outer-agent", agent);
console.log("✅ Test 6 passed: agent can be used as driver parameter");

// ✅ Test 7: AgentInstance should also have AgentService-specific methods
const send: (msg: string) => Promise<void> = agent.send;
const react: (handlers: Record<string, any>) => () => void = agent.react;
const clear: () => void = agent.clear;
console.log("✅ Test 7 passed: agent has send, react, clear methods");

// ✅ Test 8: AgentInstance should have Agent data
const id: string = agent.id;
const name: string = agent.name;
console.log("✅ Test 8 passed: agent has id and name from Agent data");

console.log("\n🎉 All type tests passed! Agent-as-Driver pattern is properly typed.");

export { };
