/**
 * User - User identity concept
 *
 * Represents a user in the system. Currently minimal,
 * can be extended later with name, email, preferences, etc.
 */
export interface User {
  /**
   * Unique user identifier
   */
  readonly userId: string;
}
