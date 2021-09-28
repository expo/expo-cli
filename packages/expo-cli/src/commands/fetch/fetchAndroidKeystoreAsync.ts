import * as path from 'path';

import { Context } from '../../credentials';
import { runCredentialsManager } from '../../credentials/route';
import { DownloadKeystore } from '../../credentials/views/AndroidKeystore';
import { assertSlug, maybeRenameExistingFileAsync, Options } from './utils';

export async function actionAsync(projectRoot: string, options: Options): Promise<void> {
  const ctx = new Context();
  await ctx.init(projectRoot, {
    nonInteractive: options.parent?.nonInteractive,
  });

  const keystoreFilename = `${ctx.manifest.slug}.jks`;
  await maybeRenameExistingFileAsync(projectRoot, keystoreFilename);
  const backupKeystoreOutputPath = path.resolve(projectRoot, keystoreFilename);
  const experienceName = `@${ctx.projectOwner}/${ctx.manifest.slug}`;

  assertSlug(ctx.manifest.slug);
  await runCredentialsManager(
    ctx,
    new DownloadKeystore(experienceName, {
      outputPath: backupKeystoreOutputPath,
      displayCredentials: true,
    })
  );
}
