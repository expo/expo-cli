#!/usr/bin/env ts-node-script
import '../build/exp.js';

import program, { Command, Option } from 'commander';

import { registerCommands } from '../build/commands/index.js';

// import side-effects
type OptionData = {
  flags: string;
  required: boolean;
  description: string;
  default: any;
};

type CommandData = {
  name: string;
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
    description: command.description(),
    alias: command.alias(),
    options: command.options.map(optionAsJSON),
  };
}

function sanitizeFlags(flags: string) {
  return flags.replace('<', '[').replace('>', ']');
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
    `| ------------ | ----------------------- |`,
    ...options.map(formatOptionAsMarkdown),
    '',
  ].join('\n');
}

function formatCommandAsMarkdown(command: CommandData): string {
  return [
    `<details>`,
    `<summary>`,
    `<h3>expo ${command.name}</h3>`,
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

function formatCommandsAsMarkdown(commands: CommandData[]) {
  return commands.map(formatCommandAsMarkdown).join('\n');
}

const commands = generateCommandJSON();

console.log('');
if (['markdown', 'md'].includes(process.argv[2])) {
  console.info(formatCommandsAsMarkdown(commands));
} else {
  console.info(JSON.stringify(commands));
}
