import colorString from 'color-string';
import { fs } from 'memfs';
import { PNG } from 'pngjs';

const actualFs = jest.requireActual('fs') as typeof fs;

/**
 * Filters out only these files that belong to given rootDir and removes files that are `nulls`, because that the way that `memfs` marks file deletion
 * Each file path is then converted to relative (without starting `/` or `./`)
 * @param fsJSON
 * @param rootDir
 */
export function getDirFromFS(fsJSON: Record<string, string | null>, rootDir: string) {
  return Object.entries(fsJSON)
    .filter(([path, value]) => value !== null && path.startsWith(rootDir))
    .reduce<Record<string, string>>(
      (acc, [path, fileContent]) => ({
        ...acc,
        [path.substring(rootDir.length).startsWith('/')
          ? path.substring(rootDir.length + 1)
          : path.substring(rootDir.length)]: fileContent,
      }),
      {}
    );
}

export async function readFileFromActualFS(filePath: string): Promise<string | Buffer> {
  return new Promise<Buffer | string>((resolve, reject) =>
    actualFs.readFile(filePath, 'utf-8', (error, data) => {
      if (error) reject(error);
      else resolve(data);
    })
  );
}

export async function getPng1x1FileContent(color: string) {
  const png = new PNG({
    width: 1,
    height: 1,
    bitDepth: 8,
    colorType: 6,
    inputColorType: 6,
    inputHasAlpha: true,
  });
  const [r, g, b, a] = colorString.get(color).value;
  png.data = Buffer.from(new Uint8Array([r, g, b, a * 255]));
  return new Promise(resolve => {
    const chunks = [];
    png
      .pack()
      .on('data', data => {
        chunks.push(data);
      })
      .once('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer.toString());
      });
  });
}
