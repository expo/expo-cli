#!/usr/bin/env ts-node-script
import assert from 'assert';
import program, { Command, Option } from 'commander';
// @ts-ignore
import replaceAll from 'string-replace-all-ponyfill';
import stripAnsi from 'strip-ansi';

import { registerCommands } from '../build/commands/index.js';
import { helpGroupOrder } from '../build/exp.js';

type FigArg = {
  name?: string;
  generators?: any;
  debounce?: boolean;
  variadic?: boolean;
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
const log = console.log;

function pbcopy(contents: string) {
  const proc = require('child_process').spawn('pbcopy');
  proc.stdin.write(contents);
  proc.stdin.end();
}

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
  args: { required?: boolean; name: string; variadic?: boolean }[];
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
    args: command._args,
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

log('');
if (['markdown', 'md'].includes(process.argv[2])) {
  const contents = formatCommandsAsMarkdown(commands);
  log(contents);
  pbcopy(contents);
} else if (['fig'].includes(process.argv[2])) {
  const ICON = {
    alert: 'fig://icon?type=alert',
    android: 'fig://icon?type=android',
    ios: 'fig://icon?type=apple',
    npm: 'fig://icon?type=npm',
    string: 'fig://icon?type=string',
    box: 'fig://icon?type=box',
    scheme: 'fig://template?color=3E89F7&badge=://',
    // emoji
    init: '🌟',
    start: '🚀',
    upgrade: '⬆️',
    workers: '🧵',
    device: 'fig://template?color=fff&badge=📱',
    skip: '⏭',
    true: 'fig://template?color=2ecc71&badge=✓',
    false: '❌',
    help: '💡',
    url: '🔗',
    publish: 'fig://template?color=3E89F7&badge=☁️',
    webhooks: 'fig://icon?type=slack',
    webhooksAdd: 'fig://icon?type=slack&color=2ecc71&badge=✓',
    webhooksRemove: 'fig://icon?type=slack&color=EB1414&badge=x',
    webhooksUpdate: 'fig://icon?type=slack&color=3E89F7',
    prebuild: '🛠',
    eject: 'fig://template?color=3E89F7&badge=⏏',
    doctor: '🥼',
    customize: '🎨',
    diagnostics: '📊',
    status: 'ℹ️',
    number: '#️⃣',
    config: 'fig://icon?type=commandkey',
    credentials: '🔑',
    lock: '🔒',
    // urls
    send: 'fig://icon?type=invite',
    login: 'fig://icon?type=commandkey',
    yarn: 'fig://icon?type=yarn',
    expo: 'https://static.expo.dev/static/favicon-dark-16x16.png',

    // vscode
    xcode:
      'https://raw.githubusercontent.com/vscode-icons/vscode-icons/master/icons/file_type_xcode.svg',
    export:
      'https://raw.githubusercontent.com/vscode-icons/vscode-icons/master/icons/folder_type_expo.svg',
    webpack:
      'https://raw.githubusercontent.com/vscode-icons/vscode-icons/master/icons/file_type_webpack.svg',
  };

  const COMMAND_ICONS: Record<string, string> = {
    'build:ios': ICON.ios,
    'build:android': ICON.android,
    'build:web': ICON.webpack,
    'build:status': ICON.status,
    // 'bundle-assets': ICON.foobar,
    'client:ios': ICON.ios,
    'client:install:ios': ICON.ios,
    'client:install:android': ICON.android,
    config: ICON.config,
    'credentials:manager': ICON.credentials,
    'customize:web': ICON.customize,
    diagnostics: ICON.diagnostics,
    doctor: ICON.doctor,
    eject: ICON.eject,
    export: ICON.export,
    'fetch:ios:certs': ICON.ios,
    'fetch:android:keystore': ICON.android,
    'fetch:android:hashes': ICON.android,
    'fetch:android:upload-cert': ICON.android,
    init: ICON.init,
    install: ICON.npm,
    login: ICON.login,
    logout: ICON.login,
    prebuild: ICON.prebuild,

    // 'prepare-detached-build': ICON.foobar,

    publish: ICON.publish,
    'publish:set': ICON.publish,
    'publish:rollback': ICON.publish,
    'publish:history': ICON.publish,
    'publish:details': ICON.publish,

    'push:android:upload': ICON.android,
    'push:android:show': ICON.android,
    'push:android:clear': ICON.android,

    register: ICON.login,
    'run:android': ICON.android,
    'run:ios': ICON.xcode,
    send: ICON.send,
    start: ICON.start,
    'start:web': ICON.webpack,
    upgrade: ICON.upgrade,
    'upload:android': ICON.android,
    'upload:ios': ICON.ios,
    url: ICON.url,
    'url:ipa': ICON.ios,
    'url:apk': ICON.android,
    webhooks: ICON.webhooks,
    'webhooks:add': ICON.webhooksAdd,
    'webhooks:remove': ICON.webhooksRemove,
    'webhooks:update': ICON.webhooksUpdate,
    whoami: ICON.login,
  };

  const figSubcommands: FigSpec[] = [];

  const booleanArg: FigArg = {
    name: 'boolean',
    isOptional: true,
    suggestions: [
      { name: 'true', icon: ICON.true },
      { name: 'false', icon: ICON.false },
    ],
  };
  const helpOption: FigSpec = {
    name: ['-h', '--help'],
    priority: 1,
    description: 'Output usage information',
    icon: ICON.help,
  };
  const versionOption: FigSpec = {
    name: ['-V', '--version'],
    description: 'Output the version number',
    icon: ICON.help,
    priority: 1,
  };

  const getGeneratorArgs = (generator: string, args: Partial<FigArg> = {}): FigArg => ({
    generators: `_gen[\`${generator}\`]`,
    ...args,
  });

  for (const command of commands) {
    let priorityIndex = helpGroupOrder.findIndex(v => v === command.group);
    if (priorityIndex > -1) {
      priorityIndex = helpGroupOrder.length - priorityIndex;
    }
    const subcommand: FigSpec = {
      name: [command.name, command.alias].filter(Boolean) as string[],
      hidden: command.group === 'internal',
      description: stripAnsi(command.description),
      priority: 50 + priorityIndex,
      // fig uses `isOptional` instead of `required`
      args: (command.args || []).map(({ required, ...arg }) => {
        // `expo start [path]` is a common pattern in expo-cli, this defaults them to folders.
        const template = arg.name === 'path' ? 'folders' : undefined;
        return {
          isOptional: !required,
          template,
          ...arg,
        };
      }),
      options: [helpOption],
    };

    // Command icons
    if (command.name in COMMAND_ICONS) {
      subcommand.icon = COMMAND_ICONS[command.name];
    }

    // Command args
    if (command.name === 'install') {
      assert(
        Array.isArray(subcommand.args) && subcommand.args[0],
        'install [...packages] arg cannot be found'
      );
      subcommand.args[0] = getGeneratorArgs('npm', {
        ...subcommand.args[0],
        debounce: true,
      });
    }

    // Delete empty arrays for fig linting
    if (Array.isArray(subcommand.args) && !subcommand.args.length) {
      delete subcommand.args;
    }

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
      let args: FigArg = argName
        ? {
            name: argName,
            isOptional: !isRequired,
            // [dir] -> folders
            // [path|file] -> filepaths
            template:
              argName === 'dir'
                ? 'folders'
                : ['file', 'path'].includes(argName)
                ? 'filepaths'
                : undefined,
            // suggestions: ["Debug", "Release"],
          }
        : booleanArg;

      let extraPriority = 0;
      if (name.includes('--platform')) {
        args.name = 'platform';
        args.suggestions = argName.split('|').map(name => ({
          name,
          icon: name === 'ios' ? ICON.ios : name === 'android' ? ICON.android : undefined,
        }));

        extraPriority++;
      } else if (name[0] === '--config') {
        // config is deprecated so move it lower
        extraPriority--;
      } else if (name[0] === '--max-workers') {
        args = getGeneratorArgs('max-workers', { ...args, name: 'Number of workers' });
      }

      if (command.name === 'run:ios') {
        if (name.includes('--configuration')) {
          args = getGeneratorArgs('xcode-configuration', args);
        } else if (name.includes('--scheme')) {
          args = getGeneratorArgs('xcode-scheme', args);
          // User should choose schemes before devices as schemes can filter out devices
          extraPriority += 2;
        } else if (name.includes('--device')) {
          args = getGeneratorArgs('xcode-devices', { ...args, isOptional: false });
          extraPriority++;
        }
      }

      const getOptionIcon = (option: OptionData) => {
        if (option.deprecated || name.includes('--config')) {
          return ICON.alert;
        } else if (option.flags.includes('-android')) {
          return ICON.android;
        } else if (option.flags.includes('-ios') || option.flags.includes('-apple')) {
          return ICON.ios;
        } else if (option.flags.includes('-no-')) {
          return ICON.skip;
        } else if (option.flags.includes('-npm') || option.flags.includes('-install')) {
          return ICON.npm;
        } else if (option.flags.includes('-yarn')) {
          return ICON.yarn;
        } else if (option.flags.includes('-name')) {
          return ICON.string;
        } else if (name.includes('--yes')) {
          return ICON.true;
        } else if (name.includes('--scheme') && command.name !== 'run:ios') {
          return ICON.scheme;
        } else if (name.includes('--device')) {
          return ICON.device;
        } else if (name.includes('--template')) {
          return ICON.box;
        } else if (name.includes('--https')) {
          return ICON.lock;
        } else if (name.includes('--max-workers')) {
          return ICON.workers;
        } else if (name.includes('--port')) {
          return ICON.number;
        } else if (
          option.flags.includes('-username') ||
          option.flags.includes('-password') ||
          option.flags.includes('-otp')
        ) {
          return ICON.string;
        }
        return undefined;
      };

      subcommand.options!.push({
        name,
        description: stripAnsi(option.description),
        args,
        icon: getOptionIcon(option),
        // ensure that command options are placed above path suggestions (+76)
        // priority: 76 + extraPriority,
      });

      // TODO: enum types (platform)
    }

    figSubcommands.push(subcommand);
  }

  const figSpec = {
    name: 'expo',
    // website favicon
    icon: ICON.expo,
    description: 'Tools for creating, running, and deploying Universal Expo and React Native apps',
    options: [helpOption, versionOption],
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
  // Copyright (c) 2021-present 650 Industries, Inc. (aka Expo)
  // Generated by running \`yarn introspect fig\` in expo-cli/packages/expo-cli
  // expo-cli@${require('../package.json').version}

  const _gen: Record<string, Fig.Generator> = {
    "npm": {
      script(context) {
        if (context[context.length - 1] === "") return "";
        const searchTerm = context[context.length - 1];
        return \`curl -s -H "Accept: application/json" "https://api.npms.io/v2/search?q=$\{searchTerm}&size=20"\`;
      },
      postProcess(script: string) {
        try {
          const results: {
            package: {
              name: string;
              description: string;
            };
            searchScore: number;
          }[] = JSON.parse(script).results;
          return results.map((item) => ({
            name: item.package.name,
            description: item.package.description,
          })) as Fig.Suggestion[];
        } catch (e) {
          return [];
        }
      },
    },
    "xcode-configuration": {
      script: "xcodebuild -project ios/*.xcodeproj -list -json",
      postProcess: (script: string) => JSON.parse(script).project.configurations.map((name) => ({ name })),
    },
    "xcode-scheme": {
      script: "xcodebuild -project ios/*.xcodeproj -list -json",
      postProcess: (script: string) => JSON.parse(script).project.schemes.map((name) => ({ name })),
    },
    "xcode-devices": {
      script: "xcrun xctrace list devices",
      postProcess: (script: string) =>
        script
          .split("\\n")
          .filter((item) => !item.match(/^=/))
          .filter(Boolean)
          .map((item) => item.split(/(.*?) (\\(([0-9.]+)\\) )?\\(([0-9A-F-]+)\\)/i))
          // filter catalyst
          .filter((item: string[] | null) => !!item?.[3])
          .map(([, name, , osVersion, udid]) => ({
            displayName: \`$\{name.trim()} ($\{osVersion})\`,
            name: udid,
          })),
    },
    "max-workers": {
      script: "sysctl -n hw.ncpu",
      postProcess: (script: string) => {
        const count = Number(script);
        return Array.from({ length: count }, (_, i) => {
          const v = count - i;
          return {
            priority: v,
            name: String(v),
          };
        });
      }
    }
  }

  export const completionSpec: Fig.Spec = ${parsed};
  `;

  // Generate a schema for https://github.com/withfig/autocomplete

  log(contents);
  pbcopy(contents);
} else {
  const contents = JSON.stringify(commands);
  log(contents);
  pbcopy(contents);
}
