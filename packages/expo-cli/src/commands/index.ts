import type { Command } from 'commander';

const COMMANDS = [
  require('./auth/login'),
  require('./auth/logout'),
  require('./auth/register'),
  require('./auth/whoami'),
  require('./build'),
  require('./credentials'),
  require('./eject/customize'),
  require('./eject/prebuild'),
  require('./expokit/bundle-assets'),
  require('./expokit/prepare-detached-build'),
  require('./export/export'),
  require('./fetch'),
  require('./info/config/config'),
  require('./info/diagnostics'),
  require('./info/doctor'),
  require('./info/upgrade'),
  require('./init'),
  require('./install'),
  require('./publish/publish'),
  require('./push'),
  require('./run'),
  require('./send'),
  require('./start'),
  require('./upload'),
  // Moved this to below upload for the ordering in the help command.
  // eslint-disable-next-line import/order
  require('./client'),
  require('./url'),
  require('./webhooks'),
];

export function registerCommands(program: Command) {
  COMMANDS.forEach(commandModule => {
    commandModule.default(program);
  });
}
