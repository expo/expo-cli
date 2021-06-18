import chalk from 'chalk';
import prettyBytes from 'pretty-bytes';
import stripAnsi from 'strip-ansi';
import table from 'text-table';

export function createFilesTable(files: [string, string | Uint8Array][]): string {
  const tableData = files.map((item, index) => {
    const fileBranch = index === 0 ? '┌' : index === files.length - 1 ? '└' : '├';

    return [`${fileBranch} ${item[0]}`, prettyBytes(Buffer.byteLength(item[1], 'utf8'))];
  });
  return table([['Bundle', 'Size'].map(v => chalk.underline(v)), ...tableData], {
    align: ['l', 'r'],
    stringLength: str => stripAnsi(str).length,
  });
}
