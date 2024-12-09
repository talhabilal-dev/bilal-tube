class ApiError extends Error {
  constructor(status, message = "something went wrong", errors = []) {
    super();
    this.status = status;
    this.message = message;
    this.errors = errors;
    this.success = false;
    this.data = null;
  }
}
