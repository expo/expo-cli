#!/usr/bin/env ts-node-script

import program, { Command, Option } from 'commander';

import { registerCommands } from '../build/commands/index.js';
import { helpGroupOrder } from '../build/exp.js';

// import side-effects
type OptionData = {
  flags: string;
  required: boolean;
  description: string;
  default: any;
};

type CommandData = {
  name: string;
  group: string;
  description: string;
  alias?: string;
  options: OptionData[];
};

// Sets up commander with a minimal setup for inspecting commands and extracting
// data from them.
function generateCommandJSON() {
  program.name('expo');
  registerCommands(program);
  return program.commands.map(commandAsJSON);
}

// The type definition for Option seems to be wrong - doesn't include defaultValue
function optionAsJSON(option: Option & { defaultValue: any }): OptionData {
  return {
    flags: option.flags,
    required: option.required,
    description: option.description,
    default: option.defaultValue,
  };
}

function commandAsJSON(command: Command): CommandData {
  return {
    name: command.name(),
    group: command.__helpGroup,
    description: command.description(),
    alias: command.alias(),
    options: command.options.map(optionAsJSON),
  };
}

/** The easiest workaround for | (pipe) being confused with a markdown table
 * separator and breaking marktown table autoformatting is to use ⎮ (U+23AE,
 * Integral Extension) instead. <> are replaced by [] for HTML reasons. */
function sanitizeFlags(flags: string) {
  return flags.replace('<', '[').replace('>', ']').replace('|', '⎮');
}

function formatOptionAsMarkdown(option: OptionData) {
  return `| \`${sanitizeFlags(option.flags)}\` | ${option.description} |`;
}

function formatOptionsAsMarkdown(options: OptionData[]) {
  if (!options || !options.length) {
    return 'This command does not take any options.';
  }

  return [
    `| Option         | Description             |`,
    `| -------------- | ----------------------- |`,
    ...options.map(formatOptionAsMarkdown),
    '',
  ].join('\n');
}

function formatCommandAsMarkdown(command: CommandData): string {
  return [
    `<details>`,
    `<summary>`,
    `<h4>expo ${command.name}</h4>`,
    `<p>${command.description}</p>`,
    `</summary>`,
    `<p>`,
    ...(command.alias ? ['', `Alias: \`expo ${command.alias}\``] : []),
    '',
    formatOptionsAsMarkdown(command.options),
    '',
    '</p>',
    '</details>',
    '',
  ].join('\n');
}

function groupBy<T>(arr: T[], block: (v: T) => any): Record<string, T[]> {
  const out: Record<string, T[]> = {};

  for (const i of arr) {
    const key = block(i);
    if (!(key in out)) {
      out[key] = [];
    }
    out[key].push(i);
  }

  return out;
}

function sortCommands(commands: CommandData[]) {
  const groupedCommands = groupBy(commands, command => command.group);
  const groupOrder = [...new Set([...helpGroupOrder, ...Object.keys(groupedCommands)])];
  // Reverse the groups
  const sortedGroups: Record<string, CommandData[]> = {};
  while (groupOrder.length) {
    const group = groupOrder.shift()!;
    if (group in groupedCommands) {
      sortedGroups[group] = groupedCommands[group];
    }
  }
  return sortedGroups;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatCommandsAsMarkdown(commands: CommandData[]) {
  const grouped = sortCommands(commands);
  return Object.entries(grouped)
    .map(([groupName, commands]) => {
      // Omit internal and eas commands from the docs
      if (['eas', 'internal'].includes(groupName)) {
        return '';
      }

      const md = commands.map(formatCommandAsMarkdown).join('\n');
      const header = capitalize(groupName);
      return `---\n\n### ${header}\n\n${md}`;
    })
    .join('\n');
}

const commands = generateCommandJSON();

// eslint-disable-next-line no-console
console.log('');
if (['markdown', 'md'].includes(process.argv[2])) {
  // eslint-disable-next-line no-console
  console.log(formatCommandsAsMarkdown(commands));
} else {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(commands));
}
