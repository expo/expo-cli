export default class IconError extends Error {
  constructor(msg) {
    super(msg);
    this.name = this.constructor.name;
  }
}
