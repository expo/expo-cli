import fs from 'fs-extra';
import path from 'path';

import { XMLObject } from './XML';

export type ResourceXML = {
  resources: XMLObject;
};

export type ResourceItemXML = {
  _: string;
  $: {
    name: string;
  };
};

export async function getProjectResourcePathAsync(
  projectDir: string,
  { kind = 'values', name }: { kind?: string; name: string }
): Promise<string | null> {
  try {
    const shellPath = path.join(projectDir, 'android');
    if ((await fs.stat(shellPath)).isDirectory()) {
      const stylesPath = path.join(shellPath, `app/src/main/res/${kind}/${name}.xml`);
      await fs.ensureFile(stylesPath);
      return stylesPath;
    }
  } catch (error) {
    throw new Error(`Could not create android/app/src/main/res/${kind}/${name}.xml`);
  }

  return null;
}
