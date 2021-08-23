import fs from 'fs';
import readLastLines from 'read-last-lines';

// truncate the last n lines in a file
export async function truncateLastLinesAsync(filePath: string, n: number) {
  const lines = await readLastLines.read(filePath, n);
  const toVanquish = lines.length;
  const { size } = await fs.promises.stat(filePath);
  await fs.promises.truncate(filePath, size - toVanquish);
}
