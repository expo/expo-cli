import crypto from 'crypto';
import type { Graph, Module, SerializerOptions } from 'metro';

import type { MetroPlugin } from './MetroSerializer';

const countLines = (code: string) => code.split('\n').length;

function createHash(src: string): string {
  // this doesn't need to be secure, the shorter the better.
  const hash = crypto.createHash('sha1').update(src).digest('hex');
  return `prelude-${hash}.js`;
}

// A custom serializer for defining constant values.
export function DefinePlugin(define: Record<string, any>): MetroPlugin {
  const runtime = {
    supportsBigIntLiteral() {
      return false;
    },
  };
  return (
    entryPoint: string,
    preModules: readonly Module[],
    graph: Graph,
    options: SerializerOptions
  ) => {
    const code = Object.entries(define)
      .map(([k, v]) => {
        const code = toCode(v, runtime);
        if (k.includes('process.env')) {
          return `${k} = ${code};`;
        } else {
          return `const ${k} = ${code};`;
        }
      })
      .join('\n');

    let preludeIndex = preModules.findIndex(item => item.path === '__prelude__') + 1;
    if (preludeIndex < 0) preludeIndex = 0;
    // @ts-ignore: readonly
    preModules.splice(preludeIndex, 0, createScript(createHash(code), code));
    console.log('preModules', preModules);
  };
}

function createScript(name: string, code: string) {
  return {
    dependencies: new Map(),
    getSource: () => Buffer.from(''),
    inverseDependencies: new Set(),
    output: [
      {
        type: 'js/script/virtual',
        data: {
          code,
          lineCount: countLines(code),
          // TODO: Ensure this doesn't break source maps
          map: [],
        },
      },
    ],
    path: '<generated>/' + name,
  };
}

export const stringifyObj = (
  obj: any[] | Record<string, any>,
  runtimeTemplate: RuntimeTemplate,
  asiSafe?: boolean | undefined | null
): string => {
  let code;
  const arr = Array.isArray(obj);
  if (arr) {
    code = `[${obj.map((code: any) => toCode(code, runtimeTemplate, null)).join(',')}]`;
  } else {
    code = `{${Object.entries(obj)
      .map(([key, code]) => JSON.stringify(key) + ':' + toCode(code, runtimeTemplate, null))
      .join(',')}}`;
  }

  switch (asiSafe) {
    case null:
      return code;
    case true:
      return arr ? code : `(${code})`;
    case false:
      return arr ? `;${code}` : `;(${code})`;
    default:
      return `Object(${code})`;
  }
};

type RuntimeTemplate = {
  supportsBigIntLiteral: () => boolean;
};

type CodeValue =
  | null
  | undefined
  | RegExp
  | Function
  | string
  | number
  | boolean
  | bigint
  | undefined;

const toCode = (
  code: CodeValue,
  runtimeTemplate: RuntimeTemplate,
  asiSafe?: boolean | undefined | null
): string => {
  if (code === null) {
    return 'null';
  } else if (code === undefined) {
    return 'undefined';
  } else if (Object.is(code, -0)) {
    return '-0';
  } else if (code instanceof RegExp && code.toString) {
    return code.toString();
  } else if (typeof code === 'function' && code.toString) {
    return '(' + code.toString() + ')';
  } else if (typeof code === 'object') {
    return stringifyObj(code, runtimeTemplate, asiSafe);
  } else if (typeof code === 'bigint') {
    return runtimeTemplate.supportsBigIntLiteral() ? `${code}n` : `BigInt("${code}")`;
  }
  return code + '';
};
