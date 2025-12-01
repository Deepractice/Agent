/**
 * DefinitionManagerImpl - In-memory implementation of DefinitionManager
 *
 * Part of Docker-style layered architecture:
 * Definition → [auto] → MetaImage → Session → Agent
 *
 * This implementation stores definitions in memory.
 * When a definition is registered, it auto-creates a MetaImage.
 */

import type {
  DefinitionManager,
  AgentDefinition,
  Repository,
  ImageRecord,
} from "@deepractice-ai/agentx-types";
import { createLogger } from "@deepractice-ai/agentx-logger";

const logger = createLogger("agentx/DefinitionManager");

/**
 * Generate MetaImage ID from definition name
 */
function generateMetaImageId(definitionName: string): string {
  return `meta_${definitionName}`;
}

/**
 * In-memory DefinitionManager implementation
 */
export class DefinitionManagerImpl implements DefinitionManager {
  private definitions = new Map<string, AgentDefinition>();

  constructor(private readonly repository: Repository) {}

  register(definition: AgentDefinition): void {
    if (this.definitions.has(definition.name)) {
      throw new Error(`Definition already exists: ${definition.name}`);
    }

    // Store definition in memory
    this.definitions.set(definition.name, definition);

    // Auto-create MetaImage
    const metaImageId = generateMetaImageId(definition.name);
    const imageRecord: ImageRecord = {
      imageId: metaImageId,
      type: "meta",
      definitionName: definition.name,
      parentImageId: null,
      definition: definition as unknown as Record<string, unknown>,
      config: {},
      messages: [],
      createdAt: new Date(),
    };

    // Save MetaImage to repository (fire-and-forget for sync API)
    this.repository.saveImage(imageRecord).catch((err) => {
      logger.error("Failed to save MetaImage", { definitionName: definition.name, error: err });
    });

    logger.info("Definition registered", {
      name: definition.name,
      metaImageId,
    });
  }

  get(name: string): AgentDefinition | undefined {
    return this.definitions.get(name);
  }

  list(): AgentDefinition[] {
    return Array.from(this.definitions.values());
  }

  has(name: string): boolean {
    return this.definitions.has(name);
  }

  unregister(name: string): boolean {
    const definition = this.definitions.get(name);
    if (!definition) {
      return false;
    }

    // Remove definition
    this.definitions.delete(name);

    // Remove associated MetaImage
    const metaImageId = generateMetaImageId(name);
    this.repository.deleteImage(metaImageId).catch((err) => {
      logger.error("Failed to delete MetaImage", { definitionName: name, error: err });
    });

    logger.info("Definition unregistered", { name });
    return true;
  }
}
