/**
 * Copyright (c) 2022 650 Industries, Inc. (aka Expo)
 * Copyright (c) npm, Inc. and Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Based on https://github.com/npm/cli/blob/357b0af2af2b07a58d2d837043d1d77c9495d8b5/lib/utils/explain-dep.js
 */
import chalk from 'chalk';
import { relative } from 'path';

import { Dependent, DependentType, NodePackage, RootNodePackage } from './why.types';

type Color = Record<string, (str: string) => string>;

const nocolor: Color = {
  bold: s => s,
  dim: s => s,
  red: s => s,
  yellow: s => s,
  cyan: s => s,
  magenta: s => s,
  blue: s => s,
  green: s => s,
};

const allcolor: Color = {
  bold: chalk.bold,
  dim: chalk.dim,
  red: chalk.red,
  yellow: chalk.yellow,
  cyan: chalk.cyan,
  magenta: chalk.magenta,
  blue: chalk.blue,
  green: chalk.green,
};

/** Print explanation. */
export const explainNode = (
  node: RootNodePackage | NodePackage,
  depth?: number,
  color: Color = allcolor
) => {
  const isFirst = depth == null;
  if (isFirst) {
    depth = Infinity;
  }
  const format = isFirst ? color.red : nocolor.red;
  return (
    format(printNode(node, color)) +
    explainDependents(node, depth!, color) +
    explainLinksIn(node, depth!, color)
  );
};

const colorType = (type: DependentType, color: Color) => {
  const { red, yellow, cyan, magenta, blue, green } = color ? chalk : nocolor;
  const style =
    type === 'extraneous'
      ? red
      : type === 'dev'
      ? yellow
      : type === 'optional'
      ? cyan
      : type === 'peer'
      ? magenta
      : type === 'bundled'
      ? blue
      : type === 'workspace'
      ? green
      : /* istanbul ignore next */ (s: string) => s;
  return style(type);
};

export const printNode = (node: RootNodePackage | NodePackage, color: Color) => {
  const { name, version, location, extraneous, dev, optional, peer, bundled, isWorkspace } = node;
  const { bold, dim, green } = color ? chalk : nocolor;
  const extra = [];
  if (extraneous) {
    extra.push(' ' + bold(colorType('extraneous', color)));
  }

  if (dev) {
    extra.push(' ' + bold(colorType('dev', color)));
  }

  if (optional) {
    extra.push(' ' + bold(colorType('optional', color)));
  }

  if (peer) {
    extra.push(' ' + bold(colorType('peer', color)));
  }

  if (bundled) {
    extra.push(' ' + bold(colorType('bundled', color)));
  }

  const pkgid = isWorkspace ? green(`${name}@${version}`) : `${bold(name)}@${bold(version)}`;

  return `${pkgid}${extra.join('')}` + (location ? dim(`\n${location}`) : '');
};

const explainLinksIn = ({ linksIn }: NodePackage, depth: number, color: Color): string => {
  if (!linksIn || !linksIn.length || depth <= 0) {
    return '';
  }

  const messages = linksIn.map(link => explainNode(link, depth - 1, color));
  const str = '\n' + messages.join('\n');
  return str.split('\n').join('\n  ');
};

const explainDependents = ({ dependents }: NodePackage, depth: number, color: Color): string => {
  if (!dependents || !dependents.length || depth <= 0) {
    return '';
  }

  const max = Math.ceil(depth / 2);
  const messages = dependents.slice(0, max).map(edge => explainEdge(edge, depth, color));

  // show just the names of the first 5 deps that overflowed the list
  if (dependents.length > max) {
    let len = 0;
    const maxLen = 50;
    const showNames = [];
    for (let i = max; i < dependents.length; i++) {
      const {
        from: { name = 'the root project' },
      } = dependents[i];
      len += name.length;
      if (len >= maxLen && i < dependents.length - 1) {
        showNames.push('...');
        break;
      }
      showNames.push(name);
    }
    const show = `(${showNames.join(', ')})`;
    messages.push(`${dependents.length - max} more ${show}`);
  }

  const str = '\n' + messages.join('\n');
  return str.split('\n').join('\n  ');
};

export const explainEdge = (
  { name, type, bundled, from, spec }: Dependent,
  depth: number,
  color: Color
): string => {
  const { bold, red } = color ? chalk : nocolor;
  const dep =
    type === 'workspace'
      ? bold(relative(from.location!, spec.slice('file:'.length)))
      : `${bold(name)}@"${bold(spec)}"`;
  const fromMsg = ` from ${explainFrom(from, depth, color)}`;

  // Highlight the tip of the tree.
  if (fromMsg === ' from the root project') {
    return red(dep);
  }
  return (
    (type === 'prod' ? '' : `${colorType(type, color)} `) +
    (bundled ? `${colorType('bundled', color)} ` : '') +
    `${dep}${fromMsg}`
  );
};

const explainFrom = (from: NodePackage, depth: number, color: Color): string => {
  if (!from.name && !from.version) {
    return 'the root project';
  }

  return (
    printNode(from, color) +
    explainDependents(from, depth - 1, color) +
    explainLinksIn(from, depth - 1, color)
  );
};
