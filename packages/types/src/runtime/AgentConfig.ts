/**
 * AgentConfig - Runtime configuration for Agent instance
 *
 * This is for runtime-specific configuration that may vary per execution.
 * Static configuration (name, description, systemPrompt, mcpServers) should
 * be stored in ImageRecord, not here.
 *
 * Currently a placeholder - add runtime-specific fields as needed.
 */
export type AgentConfig = Record<string, unknown>;
