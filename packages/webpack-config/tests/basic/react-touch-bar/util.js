// @flow

const ignored = ['onClick', 'onChange', 'children'];

export function getUpdatePayload(props: any, nextProps: any) {
  const filteredProps = Object.keys(nextProps).filter(
    (key: string): boolean => !ignored.includes(key)
  );

  return filteredProps.reduce((payload: Object, prop: string): Object => {
    const current = props[prop];
    const next = nextProps[prop];

    if (isArray(current) && isArray(next)) {
      if (!isArrayEqual(current, next)) {
        payload[prop] = next;
      }
    } else if (isObject(current) && isObject(next)) {
      const updatePayload = getUpdatePayload(current, next);

      if (updatePayload.length > 0) {
        payload[prop] = next;
      }
    } else if (current !== next) {
      payload[prop] = next;
    }

    return payload;
  }, {});
}

export function isObject(obj: any): boolean {
  return typeof obj === 'object';
}

export function isArray(arr: any): boolean {
  return Array.isArray(arr);
}

export function isArrayEqual(a: Array<mixed>, b: Array<mixed>): boolean {
  return a.length == b.length && a.every((item, i) => item === b[i]);
}
