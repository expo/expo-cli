import fs from 'fs-extra';
import path from 'path';
import StandaloneContext, {
  StandaloneContextDataUser,
  StandaloneContextDataService,
} from './StandaloneContext';
import { saveUrlToPathAsync } from './ExponentTools';
import logger from './Logger';

/**
 * Copy sound files for notifications to the bundle.
 */
export async function copyNotificationSoundsAsync(
  context: StandaloneContext,
  distDirectory: string
) {
  let bundledSounds: string[];
  if (context.type === 'user') {
    // copy images from local project
    const data = context.data as StandaloneContextDataUser;
    bundledSounds = data.exp.notification && data.exp.notification.bundledSounds;
  } else {
    const data = context.data as StandaloneContextDataService;
    bundledSounds = data.manifest.notification && data.manifest.notification.bundledSounds;
  }

  if (!bundledSounds) {
    return;
  }

  let bundledSoundsUrls: string[] | null = null;
  if (context.type === 'service') {
    const data = context.data as StandaloneContextDataService;
    bundledSoundsUrls = data.manifest.notification && data.manifest.notification.bundledSoundsUrl;
    if (!bundledSoundsUrls || bundledSoundsUrls.length !== bundledSounds.length) {
      throw new Error('`bundledSoundsUrl` not found.');
    }
  }

  logger.info('Copying sound files for notifications to the bundle...');
  if (!fs.existsSync(distDirectory)) {
    fs.mkdirSync(distDirectory);
  }

  await Promise.all(
    bundledSounds.map(async (bundledSound, index) => {
      const bundledSoundFilename = path.join(distDirectory, path.basename(bundledSound));
      if (context.type === 'user') {
        const sourcePath = path.resolve(
          (context.data as StandaloneContextDataUser).projectPath,
          bundledSound
        );
        await fs.copy(sourcePath, bundledSoundFilename);
      } else {
        const bundledSoundUrl = bundledSoundsUrls![index];
        await saveUrlToPathAsync(bundledSoundUrl, bundledSoundFilename);
      }
    })
  );
}
