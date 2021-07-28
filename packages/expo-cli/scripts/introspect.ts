#!/usr/bin/env ts-node-script
import program, { Command, Option } from 'commander';
// @ts-ignore
import replaceAll from 'string-replace-all-ponyfill';

import { registerCommands } from '../build/commands/index.js';
import { helpGroupOrder } from '../build/exp.js';

// import side-effects
type OptionData = {
  flags: string;
  required: boolean;
  description: string;
  default?: any;
  deprecated?: boolean;
  icon?: string;
};

type CommandData = {
  name: string;
  group: string;
  description: string;
  alias?: string;
  options: OptionData[];
  icon?: string;
};

// Sets up commander with a minimal setup for inspecting commands and extracting
// data from them.
function generateCommandJSON(): CommandData[] {
  program.name('expo');
  registerCommands(program);
  return program.commands.map(commandAsJSON);
}

// The type definition for Option seems to be wrong - doesn't include defaultValue
function optionAsJSON(option: Option & { defaultValue: any; deprecated?: boolean }): OptionData {
  return {
    flags: option.flags,
    required: option.required,
    description: option.description,
    deprecated: option.deprecated,
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
      if (['internal'].includes(groupName)) {
        return '';
      }

      const md = commands.map(formatCommandAsMarkdown).join('\n');
      const header = capitalize(groupName);
      return `---\n\n### ${header}\n\n${md}`;
    })
    .join('\n');
}

const commands = generateCommandJSON();

type FigArg = {
  name?: string;
  generators?: any;
  isOptional?: boolean;
  icon?: string;
  template?: string;
  suggestions?: string | string[] | { name: string; icon?: string }[];
};
type FigSpec = {
  name: string[];
  description: string;
  hidden?: boolean;
  priority?: number;
  options?: FigSpec[];
  icon?: string;
  args?: FigArg | FigArg[];
};
// eslint-disable-next-line no-console
console.log('');
if (['markdown', 'md'].includes(process.argv[2])) {
  // eslint-disable-next-line no-console
  console.log(formatCommandsAsMarkdown(commands));
} else if (['fig'].includes(process.argv[2])) {
  const figSubcommands: FigSpec[] = [];

  const booleanArg: FigArg = {
    name: 'boolean',
    isOptional: true,
    suggestions: [
      { name: 'true', icon: '✅' },
      { name: 'false', icon: '❌' },
    ],
  };
  const helpOption = {
    name: ['-h', '--help'],
    description: 'Output usage information',
    icon: '💡',
  };
  for (const command of commands) {
    let priorityIndex = helpGroupOrder.findIndex(v => v === command.group);
    if (priorityIndex > -1) {
      priorityIndex = helpGroupOrder.length - priorityIndex;
    }
    const subcommand: FigSpec = {
      name: [command.name, command.alias].filter(Boolean) as string[],
      hidden: command.group === 'internal',
      description: command.description,
      priority: priorityIndex,
      args: {},
      options: [helpOption],
    };

    for (const option of command.options) {
      const name = option.flags
        .split(' ')
        .filter(v => {
          // Get only the args starting with `-`
          // this prevents things like `<my-name>` from being included.
          return v.startsWith('-');
        })
        .map(v => {
          // Remove commas and other characters
          return v.match(/(--?[\w|-]+)/)?.[1];
        })
        .filter(Boolean) as string[];
      const [, argName] = option.flags.match(/(?:\[|\<)([\w|-]+)(?:\]|\>)/) || [];
      const isRequired = argName ? option.flags.includes('<') : false;
      const args: FigArg = argName
        ? {
            name: argName,
            // isOptional: !isRequired,
            // suggestions: ["Debug", "Release"],
          }
        : booleanArg;

      if (name.includes('--platform')) {
        args.name = 'platform';
        args.suggestions = argName.split('|').map(name => ({
          name,
          icon:
            name === 'ios'
              ? 'fig://icon?type=apple'
              : name === 'android'
              ? 'fig://icon?type=android'
              : undefined,
        }));
      }
      if (name[0] === '--config') {
        args.template = 'filepaths';
      }
      if (name[0] === '--max-workers') {
        args.name = 'Number of workers';
        args.generators = '_gen[`max-workers`]';
        args.icon = '🧵';
      }
      if (command.name === 'run:ios') {
        if (name[0] === '--configuration') {
          args.generators = '_gen[`xcode-configuration`]';
        }
        if (name[0] === '--scheme') {
          args.generators = '_gen[`xcode-configuration`]';
        }
        if (name[1] === '--device') {
          args.generators = '_gen[`xcode-devices`]';
        }
      }

      if (name[0] === '--configuration') {
        args.generators = '_gen[`xcode-configuration`]';
      }

      subcommand.options!.push({
        name,
        description: option.description,
        args,
      });

      // TODO: enum types (platform)

      if (option.deprecated) {
        option.icon = 'fig://icon?type=alert';
      } else if (option.flags.includes('-android')) {
        option.icon = 'fig://icon?type=android';
      } else if (option.flags.includes('-ios') || option.flags.includes('-apple')) {
        option.icon = 'fig://icon?type=apple';
      } else if (option.flags.includes('-npm') || option.flags.includes('-install')) {
        option.icon = 'fig://icon?type=npm';
      } else if (option.flags.includes('-yarn')) {
        option.icon = 'https://yarnpkg.com/favicon-32x32.png';
      } else if (option.flags.includes('-name')) {
        option.icon = 'fig://icon?type=string';
      } else if (option.flags.includes('-no-')) {
        option.icon = '⏭️';
      } else if (
        option.flags.includes('-username') ||
        option.flags.includes('-password') ||
        option.flags.includes('-otp')
      ) {
        option.icon = 'fig://icon?type=string';
      }
    }

    figSubcommands.push(subcommand);
  }

  const figSpec = {
    name: 'expo',
    // website favicon
    icon: 'https://static.expo.dev/static/favicon-dark-16x16.png',
    description: 'Tools for creating, running, and deploying Universal Expo and React Native apps',
    options: [
      helpOption,
      {
        name: ['-V', '--version'],
        description: 'Output the version number',
        icon: '💡',
      },
    ],
    subcommands: figSubcommands,
  };

  // Replace all quotes around generators
  const parsed = replaceAll(
    JSON.stringify(figSpec, null, 2),
    /"(_gen\[`.*`\])"/g,
    (_: string, inner: string) => {
      return inner;
    }
  );

  const contents = `
  // expo-cli@${require('../package.json').version}
  const _gen = {
    "xcode-configuration": {
      script: "xcodebuild -project ios/*.xcodeproj  -list -json",
      postProcess: (script: string) => JSON.parse(script).project.configurations.map((name) => ({ name })),
    },
    "xcode-schemes": {
      script: "xcodebuild -project ios/*.xcodeproj  -list -json",
      postProcess: (script: string) => JSON.parse(script).project.schemes.map((name) => ({ name })),
    },
    "xcode-devices": {
      script: "xcrun xctrace list devices",
  postProcess: (script: string) => script
      .split("\\n")
      .filter((item) => !item.match(/^=/))
      .filter(Boolean)
      .map((item) => item.split(/\([\w\d\-]+\)$/))
      .map(([name]) => ({ name: name.trim() }))
    },
    "max-workers": {
      script: "sysctl -n hw.ncpu",
      postProcess: (script: string) => Array.from({ length: Number(script) }, (_, i) => ({ name: String(i) })),
    }
  }

  export const completionSpec: Fig.Spec = ${parsed};
  `;

  // Generate a schema for https://github.com/withfig/autocomplete
  // eslint-disable-next-line no-console
  console.log(contents);

  const proc = require('child_process').spawn('pbcopy');
  proc.stdin.write(contents);
  proc.stdin.end();
} else {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(commands));
}
