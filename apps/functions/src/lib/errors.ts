/** Typed API errors mapped to HTTP responses by the error middleware. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const badRequest = (message: string): ApiError => new ApiError(400, 'BAD_REQUEST', message);
export const unauthorized = (message = 'Authentication required'): ApiError =>
  new ApiError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'Forbidden'): ApiError =>
  new ApiError(403, 'FORBIDDEN', message);
export const notFound = (message = 'Resource not found'): ApiError =>
  new ApiError(404, 'NOT_FOUND', message);
export const upstreamError = (service: string, message: string): ApiError =>
  new ApiError(502, 'UPSTREAM_ERROR', `${service}: ${message}`);
