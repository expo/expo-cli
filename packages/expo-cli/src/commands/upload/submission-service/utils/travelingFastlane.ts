import spawnAsync, { SpawnOptions } from '@expo/spawn-async';

async function runTravelingFastlaneAsync(
  command: string,
  args: ReadonlyArray<string>,
  envs?: Record<string, string>
): Promise<{ [key: string]: any }> {
  const spawnOptions: SpawnOptions = {
    env: {
      ...process.env,
      ...envs,
    },
    stdio: [0, 1, 'pipe'],
  };

  const { stderr } = await spawnAsync(command, args, spawnOptions);

  const res = JSON.parse(stderr);
  if (res.result !== 'failure') {
    return res;
  } else {
    let message =
      res.reason !== 'Unknown reason'
        ? res.reason
        : res?.rawDump?.message ?? 'Unknown error when running fastlane';
    message = `${message}${
      res?.rawDump?.backtrace
        ? `\n${res.rawDump.backtrace.map((i: string) => `    ${i}`).join('\n')}`
        : ''
    }`;
    throw new Error(message);
  }
}

export { runTravelingFastlaneAsync };
