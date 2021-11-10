import type { Command } from 'commander';

const COMMANDS = [
  require('./auth/login'),
  require('./auth/logout'),
  require('./auth/register'),
  require('./auth/whoami'),
  require('./build'),
  require('./client'),
  require('./config/config'),
  require('./credentials'),
  require('./customize'),
  require('./diagnostics'),
  require('./doctor'),
  require('./eject'),
  require('./expokit/bundle-assets'),
  require('./expokit/prepare-detached-build'),
  require('./export'),
  require('./fetch'),
  require('./init'),
  require('./install'),
  require('./prebuild'),
  require('./publish'),
  require('./push'),
  require('./run'),
  require('./send'),
  require('./start'),
  require('./upgrade'),
  require('./upload'),
  require('./url'),
  require('./webhooks'),
];

export function registerCommands(program: Command) {
  COMMANDS.forEach(commandModule => {
    commandModule.default(program);
  });
}
