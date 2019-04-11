export default class PresetError extends Error {
  constructor(key, value) {
    super(`Unknown value of "${key}": ${value}`);
    this.name = this.constructor.name;
  }
}
