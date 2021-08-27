import fs from 'fs';
import readLastLines from 'read-last-lines';

// truncate the last n lines in a file
export async function truncateLastLinesAsync(filePath: string, n: number) {
  const [lines, { size }] = await Promise.all([
    readLastLines.read(filePath, n),
    fs.promises.stat(filePath),
  ]);
  const toTruncate = lines.length;
  await fs.promises.truncate(filePath, size - toTruncate);
}
