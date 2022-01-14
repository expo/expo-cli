import { JSONValue } from '@expo/json-file';

export class ApiError extends Error {
  readonly name = 'ApiError';
  readonly isApiError = true;

  constructor(public code: string, message: string) {
    super(message);
  }
}

export class ApiV2Error extends Error {
  readonly name = 'ApiV2Error';
  details?: JSONValue;
  serverStack?: string;
  metadata?: object;
  readonly isApiError = true;

  constructor(message: string, public code: string = 'UNKNOWN') {
    super(message);
  }
}

export class AuthError extends Error {
  readonly name = 'AuthError';
  readonly isAuthError = true;

  constructor(public code: string, message: string) {
    super(message);
  }
}
