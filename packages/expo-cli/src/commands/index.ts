import { Command } from 'commander';

const COMMANDS = [
  require('./android'),
  // old command build:status is the same as new build:status so we disable it when the new one is available
  // new command only for testing, shouldn't be visible for users
  process.env.EXPO_ENABLE_NEW_TURTLE ? require('./build-native') : require('./build'),
  require('./bundle-assets'),
  require('./client'),
  require('./credentials'),
  require('./customize'),
  require('./diagnostics'),
  require('./doctor'),
  require('./eject'),
  require('./export'),
  require('./fetch'),
  require('./generate-module'),
  require('./init'),
  require('./install'),
  require('./ios'),
  require('./login'),
  require('./logout'),
  require('./opt-into-google-play-signing'),
  require('./optimize'),
  require('./prepare-detached-build'),
  require('./publish-info'),
  require('./publish-modify'),
  require('./publish'),
  require('./push-creds'),
  require('./register'),
  require('./send'),
  require('./start'),
  require('./upgrade'),
  require('./upload'),
  require('./url'),
  require('./webhooks'),
  require('./whoami'),
];

if (process.env.EXPO_DEV) {
  COMMANDS.push(require('./apply'));
}

export function registerCommands(program: Command) {
  COMMANDS.forEach(commandModule => {
    commandModule.default(program);
  });
}
