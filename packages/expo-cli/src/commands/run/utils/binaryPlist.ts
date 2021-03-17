import plist from '@expo/plist';
// @ts-ignore
import bplist from 'bplist-parser';
import fs from 'fs-extra';

export async function parseBinaryPlistAsync(plistPath: string) {
  try {
    const data = await bplist.parseFile(plistPath);
    return data[0];
  } catch (error) {
    // Parse the plist as txt
    const data = plist.parse(await fs.readFile(plistPath, 'utf8'));
    if (data) {
      return data;
    }
    throw error;
  }
}
