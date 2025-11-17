import { query } from "@anthropic-ai/claude-agent-sdk";
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { Logger } from "@deepracticex/logger";
import type { AgentConfig, SessionOptions } from "~/types";

/**
 * ClaudeAdapter - wraps @anthropic-ai/claude-agent-sdk
 *
 * Isolates Claude SDK dependency, makes it easier to:
 * - Mock in tests
 * - Swap SDK versions
 * - Add retry/error handling
 */
export class ClaudeAdapter {
  private logger: Logger;
  private currentQuery: any | null = null; // Store current query for interrupt

  constructor(
    private readonly config: AgentConfig,
    logger: Logger
  ) {
    this.logger = logger;
    this.logger.debug(
      { workspace: config.workspace, model: config.model },
      "ClaudeAdapter created"
    );
  }

  /**
   * Interrupt the current query if one is running
   */
  async interrupt(): Promise<void> {
    if (this.currentQuery && typeof this.currentQuery.interrupt === "function") {
      this.logger.info("Interrupting Claude SDK query");
      await this.currentQuery.interrupt();
      this.currentQuery = null;
    } else {
      this.logger.warn("No active query to interrupt");
    }
  }

  async *stream(prompt: string, options: SessionOptions = {}): AsyncGenerator<SDKMessage> {
    const sdkOptions = this.mapOptions(options);

    // Log all key parameters for troubleshooting
    this.logger.info(
      {
        promptLength: prompt.length,
        model: sdkOptions.model,
        cwd: sdkOptions.cwd,
        permissionMode: sdkOptions.permissionMode,
        hasApiKey: !!sdkOptions.env?.ANTHROPIC_API_KEY,
        hasBaseUrl: !!sdkOptions.env?.ANTHROPIC_BASE_URL,
        baseUrl: sdkOptions.env?.ANTHROPIC_BASE_URL,
        mcpServers: sdkOptions.mcpServers,
        hasMcpServers: !!sdkOptions.mcpServers,
      },
      "Starting Claude SDK stream with options"
    );

    try {
      this.currentQuery = query({
        prompt,
        options: sdkOptions,
      });

      let messageCount = 0;

      for await (const message of this.currentQuery) {
        messageCount++;

        this.logger.info(
          {
            messageCount,
            messageType: message.type,
            messageSubtype: (message as any).subtype, // subtype may not exist on all message types
          },
          "Received message from Claude SDK"
        );

        yield message;
      }

      this.logger.info({ messageCount }, "Claude SDK stream completed");
    } catch (err) {
      this.logger.error({ err, promptLength: prompt.length }, "Claude SDK stream failed");
      throw err;
    } finally {
      // Clear current query after completion
      this.currentQuery = null;
    }
  }

  private mapOptions(options: SessionOptions): any {
    const model = options.model || this.config.model || "claude-sonnet-4";
    return {
      cwd: this.config.workspace,
      model: this.normalizeModelName(model),
      resume: options.resume,
      mcpServers: this.config.mcpServers,
      // Load MCP configurations from Claude settings files
      // This enables compatibility with Claude CLI and Claude Desktop configurations
      settingSources: ["user", "project", "local"],
      permissionMode: "bypassPermissions",
      // Explicitly pass env to ensure PATH is inherited by spawned processes
      env: process.env,
      // Use process.execPath to get the actual node binary that's running this code
      // This works with nvm, volta, or any node version manager
      executable: process.execPath,
      // Enable streaming for real-time text updates
      includePartialMessages: true,
      // Capture stderr output from Claude SDK subprocess
      stderr: (data: string) => {
        this.logger.error({ stderr: data }, "Claude SDK stderr output");
      },
    };
  }

  private normalizeModelName(model: string): string {
    // Map full model names to SDK's short names
    const modelMap: Record<string, string> = {
      "claude-sonnet-4": "sonnet",
      "claude-opus-4": "opus",
      "claude-haiku-4": "haiku",
      "claude-haiku-4-5-20251001": "haiku", // Fast haiku variant
      "claude-3-5-sonnet": "sonnet",
      "claude-3-opus": "opus",
      "claude-3-haiku": "haiku",
    };

    return modelMap[model] || model;
  }
}
