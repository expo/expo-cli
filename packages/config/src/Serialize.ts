import { ConfigError } from './Errors';

export function serializeAndEvaluate(val: any): any {
  if (['undefined', 'string', 'boolean', 'number', 'bigint'].includes(typeof val)) {
    return val;
  } else if (typeof val === 'function') {
    // TODO: Bacon: Should we support async methods?
    return val();
  } else if (Array.isArray(val)) {
    return val.map(serializeAndEvaluate);
  } else if (typeof val === 'object') {
    const output: { [key: string]: any } = {};
    for (const property in val) {
      if (val.hasOwnProperty(property)) {
        output[property] = serializeAndEvaluate(val[property]);
      }
    }
    return output;
  }
  // symbol
  throw new ConfigError(`Expo config doesn't support \`Symbols\`: ${val}`, 'INVALID_CONFIG');
}
