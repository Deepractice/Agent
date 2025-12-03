/**
 * Channel - Bidirectional communication medium between Ecosystems
 *
 * Channel is the transport layer that connects two Ecosystems.
 * It does not belong to any Ecosystem - it's the infrastructure
 * that enables Ecosystems to communicate.
 *
 * From systems theory perspective:
 * - Ecosystem A's Effector → Channel → Ecosystem B's Receptor
 * - Ecosystem B's Effector → Channel → Ecosystem A's Receptor
 *
 * @example
 * ```typescript
 * // Client side
 * const channel = new WebSocketChannel({ url: "ws://localhost:5200" });
 * await channel.connect();
 *
 * // Send events to server
 * channel.send({ type: "message_send_request", data: { content: "Hello" } });
 *
 * // Receive events from server
 * channel.on((event) => {
 *   console.log("Received:", event.type);
 * });
 * ```
 */

import type { AnyEnvironmentEvent } from "~/ecosystem/event";

/**
 * Channel state
 */
export type ChannelState = "disconnected" | "connecting" | "connected" | "reconnecting";

/**
 * Channel event handler
 */
export type ChannelEventHandler = (event: AnyEnvironmentEvent) => void;

/**
 * Channel state change handler
 */
export type ChannelStateHandler = (state: ChannelState) => void;

/**
 * Unsubscribe function
 */
export type ChannelUnsubscribe = () => void;

/**
 * Channel - Bidirectional communication interface
 *
 * Connects two Ecosystems by providing:
 * - send(): Effector output → Channel → Remote Receptor
 * - on(): Remote Effector → Channel → Local Receptor
 */
export interface Channel {
  /**
   * Current channel state
   */
  readonly state: ChannelState;

  /**
   * Connect to remote endpoint
   *
   * @returns Promise that resolves when connected
   * @throws Error if connection fails
   */
  connect(): Promise<void>;

  /**
   * Disconnect from remote endpoint
   */
  disconnect(): void;

  /**
   * Send event to remote Ecosystem
   *
   * @param event - Event to send
   * @throws Error if not connected
   */
  send(event: AnyEnvironmentEvent): void;

  /**
   * Subscribe to events from remote Ecosystem
   *
   * @param handler - Event handler
   * @returns Unsubscribe function
   */
  on(handler: ChannelEventHandler): ChannelUnsubscribe;

  /**
   * Subscribe to channel state changes
   *
   * @param handler - State change handler
   * @returns Unsubscribe function
   */
  onStateChange(handler: ChannelStateHandler): ChannelUnsubscribe;
}
