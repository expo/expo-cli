import type { Command } from 'commander';

const COMMANDS = [
  require('./auth/login'),
  require('./auth/logout'),
  require('./auth/register'),
  require('./auth/whoami'),
  require('./build'),
  require('./client'),
  require('./credentials'),
  require('./customize'),
  require('./eject'),
  require('./expokit/bundle-assets'),
  require('./expokit/prepare-detached-build'),
  require('./export'),
  require('./fetch'),
  require('./info/config/config'),
  require('./info/diagnostics'),
  require('./info/doctor'),
  require('./info/upgrade'),
  require('./init'),
  require('./install'),
  require('./prebuild'),
  require('./publish'),
  require('./push'),
  require('./run'),
  require('./send'),
  require('./start'),
  require('./upload'),
  require('./url'),
  require('./webhooks'),
];

export function registerCommands(program: Command) {
  COMMANDS.forEach(commandModule => {
    commandModule.default(program);
  });
}
