/**
 * Shared test context instance
 *
 * All step definition files must import and use this shared context instance
 * to ensure state is properly shared across different step files.
 */

import { TestContext } from "./test-context";

export const sharedContext = new TestContext();
