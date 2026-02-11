class ApiError extends Error {
  constructor(statusCode, message = "Something went wrong", errors = [], stack = "", data = null) {
    super(message);
    this.statusCode = statusCode;
    this.data = data; 
    this.errors = errors;
    this.success = false;
    this.errorType = ApiError.getErrorType(statusCode);

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static getErrorType(statusCode) {
    const errorTypes = {
      400: "BAD_REQUEST",
      401: "UNAUTHORIZED",
      403: "FORBIDDEN",
      404: "NOT_FOUND",
      409: "CONFLICT",
      422: "VALIDATION_ERROR",
      429: "TOO_MANY_REQUESTS",
      500: "INTERNAL_SERVER",
    };
    return errorTypes[statusCode] || "SERVER_ERROR";
  }
}

export { ApiError };
