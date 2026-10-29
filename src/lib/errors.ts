export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} not found: ${id}` : `${resource} not found`,
      "NOT_FOUND",
      404
    );
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, "VALIDATION_ERROR", 422, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(reason = "Authentication required") {
    super(reason, "UNAUTHORIZED", 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(reason = "Access denied") {
    super(reason, "FORBIDDEN", 403);
  }
}

export class RateLimitError extends AppError {
  constructor(public readonly retryAfterMs: number) {
    super("Please wait a moment before trying again.", "RATE_LIMITED", 429);
  }
}
