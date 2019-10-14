import { Command } from 'commander';

const COMMANDS = [
  require('./android'),
  require('./build'),
  ...(process.env.EXPO_ENABLE_TURTLEV2 ? [require('./build-native')] : []),
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

export function registerCommands(program: Command) {
  COMMANDS.forEach(commandModule => {
    commandModule.default(program);
  });
}
