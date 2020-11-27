import nodeAssert from 'assert';

export class UnexpectedError extends Error {
  constructor(message: string) {
    super(`${message}\nPlease report this as an issue on https://github.com/expo/expo-cli/issues`);
  }
}

export function assert(value: any, message?: string | Error): asserts value {
  // TODO: Upgrade node? TypeScript isn't properly asserting values without this wrapper.
  return nodeAssert(value, message);
}
