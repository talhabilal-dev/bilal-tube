export class ApiError extends Error {
  constructor(
    statusCode,
    message = "Something went wrong",
    errors = [],
    stack = ""
  ) {
    const validStatusCode =
      typeof statusCode === "number" && statusCode >= 100 && statusCode <= 599
        ? statusCode
        : 500;

    super(message);
    this.statusCode = validStatusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
