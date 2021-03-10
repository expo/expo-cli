import spawnAsync from '@expo/spawn-async';

/**
 * PlistBuddy can be used to parse binary plist files.
 * Binary plist files are often found in app binaries.
 *
 * @param args
 */
async function runPlistBuddyAsync(args: string[]): Promise<string> {
  const { output } = await spawnAsync('/usr/libexec/PlistBuddy', args, {
    stdio: 'pipe',
  });
  return output.join('').trim();
}

export async function getBundleIdentifierAsync(plistPath: string): Promise<string> {
  return await runPlistBuddyAsync(['-c', 'Print:CFBundleIdentifier', plistPath]);
}
