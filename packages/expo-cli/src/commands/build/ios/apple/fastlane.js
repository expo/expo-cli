import spawnAsync from '@expo/spawn-async';

const travelingFastlane =
  process.platform === 'darwin'
    ? require('@expo/traveling-fastlane-darwin')()
    : require('@expo/traveling-fastlane-linux')();

async function runAction(fastlaneAction, args) {
  console.log(fastlaneAction, args);
  const { stderr } = await spawnAsync(fastlaneAction, args);
  const { result, ...rest } = JSON.parse(stderr.trim());
  if (result === 'success') {
    return rest;
  } else {
    const { reason, rawDump } = rest;
    throw new Error(`Reason: ${reason}, raw: ${JSON.stringify(rawDump)}`);
  }
}

export { travelingFastlane, runAction };
