import Log from '../../log';
import { learnMore } from '../utils/TerminalLink';

export async function printDeprecationNotice(): Promise<void> {
  Log.warn(
    'The last day to use expo publish is 2024-02-12 and SDK 49 is the last version to support it. Migrate to eas update.'
  );
  Log.warn(
    `${learnMore('https://blog.expo.dev/sunsetting-expo-publish-and-classic-updates-6cb9cd295378')}`
  );
}
