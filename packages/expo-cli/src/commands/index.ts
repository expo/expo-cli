import { Command } from 'commander';

console.time('require commands (total)');
const COMMANDS = [require('./build'), require('./start')];
if (process.env.EXPO_DEV) {
  COMMANDS.push(require('./apply'));
}
console.timeEnd('require commands (total)');

export function registerCommands(program: Command) {
  console.time('register commands');
  COMMANDS.forEach(commandModule => {
    commandModule.default(program);
  });
  console.timeEnd('register commands');
}
