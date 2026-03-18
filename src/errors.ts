export class HttpError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly body: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export class AuthenticationError extends HttpError {
  constructor(message = 'Authentication failed') {
    super(message, 401, '')
    this.name = 'AuthenticationError'
  }
}

export class SessionExpiredError extends HttpError {
  constructor(message = 'Session expired, please re-authenticate') {
    super(message, 401, '')
    this.name = 'SessionExpiredError'
  }
}

export class NetworkError extends HttpError {
  constructor(message = 'Network error') {
    super(message, 0, '')
    this.name = 'NetworkError'
  }
}

export class DeviceControlError extends HttpError {
  constructor(message = 'Device control failed') {
    super(message, 400, '')
    this.name = 'DeviceControlError'
  }
}
