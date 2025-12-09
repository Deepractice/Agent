/**
 * useMessageHistory - Load message history from storage
 */

import { useEffect, useRef } from "react";
import type { AgentX } from "agentxjs";
import { createLogger } from "@agentxjs/common";
import type { UIMessage } from "./types";

const logger = createLogger("ui/useMessageHistory");

export interface UseMessageHistoryOptions {
  agentx: AgentX | null;
  imageId: string | null;
  onMessagesLoaded: (messages: UIMessage[]) => void;
}

/**
 * Load message history when imageId changes
 */
export function useMessageHistory({ agentx, imageId, onMessagesLoaded }: UseMessageHistoryOptions) {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // Load existing messages for this image
    if (agentx && imageId) {
      agentx
        .request("image_messages_request", { imageId })
        .then((response) => {
          if (!mountedRef.current) return;
          const data = response.data as unknown as {
            messages: UIMessage[];
          };
          if (data.messages && data.messages.length > 0) {
            onMessagesLoaded(data.messages);
            logger.debug("Loaded messages from storage", { imageId, count: data.messages.length });
          }
        })
        .catch((err) => {
          logger.error("Failed to load messages", { imageId, error: err });
        });
    }

    return () => {
      mountedRef.current = false;
    };
  }, [agentx, imageId, onMessagesLoaded]);
}
