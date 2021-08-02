import chalk from 'chalk';

function getStringBetweenParens(value: string): string {
  const regExp = /\(([^)]+)\)/;
  const matches = regExp.exec(value);
  if (matches && matches?.length > 1) {
    return matches[1];
  }
  return value;
}

function focusLastPathComponent(value: string): string {
  const parts = value.split('/');
  if (parts.length > 1) {
    const last = parts.pop();
    const current = chalk.dim(parts.join('/') + '/');
    return `${current}${last}`;
  }
  return chalk.dim(value);
}

export function formatStackTrace(stacktrace: string, command: string): string {
  const treeStackLines: string[][] = [];
  for (const line of stacktrace.split('\n')) {
    const [first, ...parts] = line.trim().split(' ');
    // Remove at -- we'll use a branch instead.
    if (first === 'at') {
      treeStackLines.push(parts);
    }
  }

  return treeStackLines
    .map((parts, index) => {
      let first = parts.shift();
      let last = parts.pop();

      // Replace anonymous with command name
      if (first === 'Command.<anonymous>') {
        first = chalk.bold(`expo ${command}`);
      } else if (first?.startsWith('Object.')) {
        // Remove extra JS types from function names
        first = first.split('Object.').pop()!;
      } else if (first?.startsWith('Function.')) {
        // Remove extra JS types from function names
        first = first.split('Function.').pop()!;
      } else if (first?.startsWith('/')) {
        // If the first element is a path
        first = focusLastPathComponent(getStringBetweenParens(first));
      }

      if (last) {
        last = focusLastPathComponent(getStringBetweenParens(last));
      }
      const branch = (index === treeStackLines.length - 1 ? '└' : '├') + '─';
      return ['   ', branch, first, ...parts, last].filter(Boolean).join(' ');
    })
    .join('\n');
}
