import { Command } from 'commander';

const COMMANDS = [
  require('./build'),
  require('./bundle-assets'),
  require('./client'),
  require('./credentials'),
  require('./customize'),
  require('./diagnostics'),
  require('./doctor'),
  require('./eas-build'),
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
  require('./validate-dependencies'),
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
