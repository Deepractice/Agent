/**
 * defineDriver implementation
 *
 * Creates a type-safe Driver class with configuration schema attached.
 */

import type {
  AgentDriver,
  AgentContext,
  DriverClass,
  DefineDriverInput,
  ConfigSchema,
  FullConfig,
} from "@deepractice-ai/agentx-types";

/**
 * defineDriver - Create a driver class with configuration schema
 *
 * @param input - Driver definition input
 * @returns Driver class with schema attached
 */
export function defineDriver<S extends ConfigSchema>(
  input: DefineDriverInput<S>
): DriverClass & { schema: S } {
  const { name, description, config, create } = input;

  /**
   * Driver implementation class
   */
  class DriverImpl implements AgentDriver {
    readonly name: string;
    readonly description?: string;
    private instance: AgentDriver;

    constructor(context: AgentContext<FullConfig<S>>) {
      this.name = name;
      this.description = description;

      // Extract config from context (all fields except agentId and createdAt)
      const { agentId, createdAt, ...configFields } = context;

      // Apply defaults from config schema
      const configWithDefaults = config.applyDefaults(configFields as Record<string, unknown>);

      // Create the actual driver instance with merged context
      this.instance = create({
        agentId,
        createdAt,
        ...configWithDefaults,
      } as AgentContext<FullConfig<S>>);
    }

    receive(message: any): AsyncIterable<any> {
      return this.instance.receive(message);
    }

    interrupt(): void {
      this.instance.interrupt();
    }

    async destroy(): Promise<void> {
      await this.instance.destroy();
    }
  }

  // Attach schema to the class (this is the key!)
  const DriverWithSchema = DriverImpl as typeof DriverImpl & { schema: S };
  DriverWithSchema.schema = config.schema;

  // Return with proper typing
  return DriverWithSchema as unknown as DriverClass & { schema: S };
}
