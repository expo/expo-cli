import { ConfigErrorCode } from './Config.types';

export class ConfigError extends Error {
  code: ConfigErrorCode;

  constructor(message: string, code: ConfigErrorCode) {
    super(message);
    this.code = code;
  }
}
