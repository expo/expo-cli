import ExtendableError from 'es6-error';

const ERROR_PREFIX = 'Error: ';

export default class CommandError extends ExtendableError {
  code: string;
  isCommandError: true;

  constructor(
    code: string,
    message: string,
  ) {
    // If e.toString() was called to get `message` we don't want it to look
    // like "Error: Error:".
    if (message.startsWith(ERROR_PREFIX)) {
      message = message.substring(ERROR_PREFIX.length);
    }

    super(message);

    this.code = code;
    this.isCommandError = true;
  }
}
