export class APIError extends Error {
  readonly name = 'APIError';
  readonly isAPIError = true;

  constructor(public code: string, message: string) {
    super(message);
  }
}
