/**
 * @flow
 */

export default class XDLError extends Error {
  code: string;
  isXDLError: bool;

  constructor(code: string, message: string) {
    super(message);

    this.code = code;
    this.isXDLError = true;
  }
}
