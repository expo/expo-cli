import program, { Command } from 'commander';
import { UnifiedAnalytics } from 'xdl';

import { registerCommands } from '../../build/commands';
import { trackUsage } from '../../build/exp';

Command.prototype.helpGroup = jest.fn().mockImplementation(_ => program);
Command.prototype.asyncActionProjectDir = jest.fn().mockImplementation(_ => program);
Command.prototype.longDescription = jest.fn().mockImplementation(_ => program);
Command.prototype.asyncAction = jest.fn().mockImplementation(_ => program);
Command.prototype.allowOffline = jest.fn().mockImplementation(_ => program);
Command.prototype.urlOpts = jest.fn().mockImplementation(_ => program);

describe(trackUsage.name, () => {
  const commands = generateCommandJSON();
  const commandNames = commands.map(cmd => cmd.name);
  const commandAliases = commands
    .filter((cmd: CommandMockData) => cmd._alias)
    .map(cmd => cmd._alias);

  const spy = jest.spyOn(UnifiedAnalytics, 'logEvent');

  beforeEach(() => {
    spy.mockClear();
  });

  it.each(commandNames)('matches on command name: %s', name => {
    process.argv[2] = name;

    trackUsage(commands as any);

    expect(spy).toHaveBeenCalled();
  });

  it.each(commandAliases)('matches on command alias: %s', alias => {
    process.argv[2] = alias;

    trackUsage(commands as any);

    expect(spy).toHaveBeenCalled();
  });

  it('does not match on undefined aliases', () => {
    process.argv[2] = undefined;

    trackUsage(commands as any);

    expect(spy).not.toHaveBeenCalled();
  });

  it('does not match on empty string', () => {
    process.argv[2] = '';

    trackUsage(commands as any);

    expect(spy).not.toHaveBeenCalled();
  });

  it('does not match on a random string', () => {
    process.argv[2] = 'GwZ3N0&%wtea';

    trackUsage(commands as any);

    expect(spy).not.toHaveBeenCalled();
  });
});

type CommandMockData = {
  name: string;
  _name: string;
  description: string;
  alias?: string;
  _alias?: string;
};

function generateCommandJSON(): CommandMockData[] {
  program.name('expo');
  registerCommands(program);
  return program.commands.map(commandAsJSON);
}

function commandAsJSON(command: Command): CommandMockData {
  return {
    name: command.name(),
    _name: command.name(),
    description: command.description(),
    alias: command.alias(),
    _alias: command.alias(),
  };
}
