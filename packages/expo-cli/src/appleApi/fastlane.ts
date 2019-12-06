import spawnAsync from '@expo/spawn-async';
import slash from 'slash';

const travelingFastlane =
  process.platform === 'darwin'
    ? require('@expo/traveling-fastlane-darwin')()
    : require('@expo/traveling-fastlane-linux')();

const WSL_BASH_PATH = 'C:\\Windows\\system32\\bash.exe';
const WSL_BASH = 'bash';
const WSL_ONLY_PATH = 'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin';

type Options = {
  pipeStdout?: boolean;
};

async function runAction(fastlaneAction: string, args: string[], options: Options = {}) {
  const { pipeStdout = false } = options;
  const { command, commandArgs } = getCommandAndArgsForPlatform(fastlaneAction, args);
  const { stderr } = await spawnAsync(command, commandArgs, {
    stdio: ['inherit', pipeStdout ? 'inherit' : 'pipe', 'pipe'],
  });
  const { result, ...rest } = JSON.parse(stderr.trim());
  if (result === 'success') {
    return rest;
  } else {
    const { reason, rawDump } = rest;
    const err = new Error(`Reason: ${reason}, raw: ${JSON.stringify(rawDump)}`);
    // @ts-ignore
    err.rawDump = rawDump;
    throw err;
  }
}

function getCommandAndArgsForPlatform(fastlaneAction: string, args: string[]) {
  if (process.platform === 'win32') {
    const command = WSL_BASH;
    const argsJoined = args.map(i => `"${i}"`).join(' ');
    const commandArgs = [
      '-c',
      `${WSL_ONLY_PATH} ${windowsToWSLPath(fastlaneAction)} ${argsJoined}`,
    ];
    return { command, commandArgs };
  } else {
    const command = fastlaneAction;
    const commandArgs = [...args];
    return { command, commandArgs };
  }
}

function windowsToWSLPath(_path: string) {
  const slashPath = slash(_path);
  const diskLetter = _path[0].toLowerCase();
  const pathOnDisk = slashPath.slice(2);
  return `/mnt/${diskLetter}${pathOnDisk}`;
}

export { travelingFastlane, runAction, WSL_BASH_PATH };
