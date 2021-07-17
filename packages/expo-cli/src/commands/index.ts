import type { Command } from 'commander';

const COMMANDS = [
  require('./build'),
  require('./bundle'),
  require('./bundle-assets'),
  require('./client'),
  require('./config/config'),
  require('./credentials'),
  require('./customize'),
  require('./diagnostics'),
  require('./doctor'),
  require('./eject'),
  require('./export'),
  require('./fetch'),
  require('./init'),
  require('./install'),
  require('./login'),
  require('./logout'),
  require('./prebuild'),
  require('./prepare-detached-build'),
  require('./publish'),
  require('./publish-info'),
  require('./publish-modify'),
  require('./push-creds'),
  require('./register'),
  require('./run'),
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
