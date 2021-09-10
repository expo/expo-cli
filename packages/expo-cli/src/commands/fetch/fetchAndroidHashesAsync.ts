import * as fs from 'fs-extra';
import * as path from 'path';
import { AndroidCredentials } from 'xdl';

import { Context } from '../../credentials';
import { runCredentialsManager } from '../../credentials/route';
import { DownloadKeystore } from '../../credentials/views/AndroidKeystore';
import Log from '../../log';
import { assertSlug, Options } from './utils';

export async function actionAsync(projectRoot: string, options: Options): Promise<void> {
  const ctx = new Context();
  await ctx.init(projectRoot, {
    nonInteractive: options.parent?.nonInteractive,
  });
  const outputPath = path.resolve(projectRoot, `${ctx.manifest.slug}.tmp.jks`);
  try {
    assertSlug(ctx.manifest.slug);
    const experienceName = `@${ctx.projectOwner}/${ctx.manifest.slug}`;
    const view = new DownloadKeystore(experienceName, {
      outputPath,
      quiet: true,
    });
    await runCredentialsManager(ctx, view);
    const keystore = await ctx.android.fetchKeystore(experienceName);

    if (keystore) {
      await AndroidCredentials.logKeystoreHashes({
        keystorePath: outputPath,
        keystorePassword: keystore.keystorePassword,
        keyAlias: keystore.keyAlias,
        keyPassword: keystore.keyPassword,
      });
      Log.log(
        `\nNote: if you are using Google Play signing, this app will be signed with a different key after publishing to the store, and you'll need to use the hashes displayed in the Google Play console.`
      );
    } else {
      Log.warn('There is no valid Keystore defined for this app');
    }
  } finally {
    await fs.remove(outputPath);
  }
}
