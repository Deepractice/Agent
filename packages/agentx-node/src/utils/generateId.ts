/**
 * Generate a unique ID
 *
 * Simple ID generator for reactor instances.
 * Uses timestamp + random string for uniqueness.
 */

let counter = 0;

export function generateId(prefix: string = "id"): string {
  counter = (counter + 1) % 10000;
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `${prefix}_${timestamp}_${random}_${counter}`;
}
