/**
 * Endpoint - Base type for HTTP API contracts
 *
 * All endpoint definitions must conform to this structure.
 * - method: HTTP method
 * - path: Route path (supports :param for path parameters)
 * - input: Request input type
 * - output: Response output type
 */

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

/**
 * Base Endpoint interface
 *
 * @example
 * ```typescript
 * interface ListUsersEndpoint extends Endpoint<"GET", "/users", void, User[]> {}
 *
 * interface GetUserEndpoint extends Endpoint<"GET", "/users/:id", { id: string }, User> {}
 *
 * interface CreateUserEndpoint extends Endpoint<"POST", "/users", CreateUserInput, User> {}
 * ```
 */
export interface Endpoint<
  TMethod extends HttpMethod = HttpMethod,
  TPath extends string = string,
  TInput = unknown,
  TOutput = unknown,
> {
  method: TMethod;
  path: TPath;
  input: TInput;
  output: TOutput;
}
