export class NamedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class IconError extends NamedError {}

export class PresetError extends NamedError {
  constructor(key: string, value: string) {
    super(`Unknown value of "${key}": ${value}`);
  }
}
