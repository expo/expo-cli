import nodeAssert from 'assert';

export function assert(value: any, message?: string | Error): asserts value {
  // TODO: Remove after upgrading to `@types/node@^14`
  return nodeAssert(value, message);
}
