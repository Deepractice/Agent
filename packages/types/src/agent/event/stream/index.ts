/**
 * Stream Layer
 *
 * Events for incremental data transmission during streaming.
 * Each streaming phase has its own dedicated event type.
 *
 * Event flow during streaming:
 *
 * Text content block:
 * 1. MessageStartEvent
 * 2. TextContentBlockStartEvent
 * 3. TextDeltaEvent (repeated)
 * 4. TextContentBlockStopEvent
 * 5. MessageDeltaEvent
 * 6. MessageStopEvent
 *
 * Tool use content block:
 * 1. MessageStartEvent
 * 2. ToolUseContentBlockStartEvent
 * 3. InputJsonDeltaEvent (repeated)
 * 4. ToolUseContentBlockStopEvent
 * 5. MessageDeltaEvent
 * 6. MessageStopEvent
 */

// Base
export type { StreamEvent } from "./StreamEvent";

// Message lifecycle
export type { MessageStartEvent } from "./MessageStartEvent";
export type { MessageDeltaEvent } from "./MessageDeltaEvent";
export type { MessageStopEvent } from "./MessageStopEvent";

// Text content block events
export type { TextContentBlockStartEvent } from "./TextContentBlockStartEvent";
export type { TextDeltaEvent } from "./TextDeltaEvent";
export type { TextContentBlockStopEvent } from "./TextContentBlockStopEvent";

// Tool use content block events
export type { ToolUseContentBlockStartEvent } from "./ToolUseContentBlockStartEvent";
export type { InputJsonDeltaEvent } from "./InputJsonDeltaEvent";
export type { ToolUseContentBlockStopEvent } from "./ToolUseContentBlockStopEvent";
export type { ToolCallEvent } from "./ToolCallEvent";
export type { ToolResultEvent } from "./ToolResultEvent";

// Interrupt event
export type { InterruptedStreamEvent } from "./InterruptedStreamEvent";

/**
 * Union of all Stream events
 */
export type StreamEventType =
  | import("./MessageStartEvent").MessageStartEvent
  | import("./MessageDeltaEvent").MessageDeltaEvent
  | import("./MessageStopEvent").MessageStopEvent
  | import("./TextContentBlockStartEvent").TextContentBlockStartEvent
  | import("./TextDeltaEvent").TextDeltaEvent
  | import("./TextContentBlockStopEvent").TextContentBlockStopEvent
  | import("./ToolUseContentBlockStartEvent").ToolUseContentBlockStartEvent
  | import("./InputJsonDeltaEvent").InputJsonDeltaEvent
  | import("./ToolUseContentBlockStopEvent").ToolUseContentBlockStopEvent
  | import("./ToolCallEvent").ToolCallEvent
  | import("./ToolResultEvent").ToolResultEvent
  | import("./InterruptedStreamEvent").InterruptedStreamEvent;
