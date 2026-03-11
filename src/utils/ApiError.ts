export class ApiError extends Error {
  statusCode: number;
  success: boolean;
  errors: unknown[];

  constructor(statusCode = 500, message = "Something went wrong", errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.success = false;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}
