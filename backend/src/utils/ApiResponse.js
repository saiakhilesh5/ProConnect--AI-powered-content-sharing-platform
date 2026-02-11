class ApiResponse {
  constructor(statusCode, message = "Success", data = null, metadata = null) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.success = statusCode < 400;
    this.responseType = ApiResponse.getResponseType(statusCode);
    this.metadata = metadata;
    this.timestamp = new Date().toISOString();
  }

  static getResponseType(statusCode) {
    const responseTypes = {
      200: "OK",
      201: "CREATED",
      204: "NO_CONTENT",
      206: "PARTIAL_CONTENT",
      304: "NOT_MODIFIED",
    };
    return responseTypes[statusCode] || "SUCCESS";
  }
}

export { ApiResponse };
