import assert from 'assert';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';

import Log from '../../log';

export type Options = {
  parent?: {
    nonInteractive: boolean;
  };
};

export function assertSlug(slug: any): asserts slug {
  assert(slug, `${chalk.bold(slug)} field must be set in your app.json or app.config.js`);
}

export async function maybeRenameExistingFileAsync(projectRoot: string, filename: string) {
  const desiredFilePath = path.resolve(projectRoot, filename);

  if (await fs.pathExists(desiredFilePath)) {
    let num = 1;
    while (await fs.pathExists(path.resolve(projectRoot, `OLD_${num}_${filename}`))) {
      num++;
    }
    Log.log(
      `\nA file already exists at "${desiredFilePath}"\n  Renaming the existing file to OLD_${num}_${filename}\n`
    );
    await fs.rename(desiredFilePath, path.resolve(projectRoot, `OLD_${num}_${filename}`));
  }
}
