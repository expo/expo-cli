import { Command } from 'commander';

const COMMANDS = [
  // old command build:status is the same as new build:status so we disable it when the new one is available
  // new command only for testing, shouldn't be visible for users
  // eslint-disable-next-line import/order
  process.env.EXPO_ENABLE_NEW_TURTLE ? require('./eas-build') : require('./build'),
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
  require('./login'),
  require('./logout'),
  require('./prepare-detached-build'),
  require('./publish'),
  require('./publish-info'),
  require('./publish-modify'),
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
