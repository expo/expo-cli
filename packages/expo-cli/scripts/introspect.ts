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
  isVariadic?: boolean;
  isOptional?: boolean;
  icon?: string;
  template?: string;
  suggestions?: string | string[] | { name: string; icon?: string }[];
};

type FigSpec = {
  name: string[] | string;
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
  return `| \`${sanitizeFlags(option.flags)}\` | ${sanitizeFlags(option.description)} |`;
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
    `<p>${sanitizeFlags(command.description)}</p>`,
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
  let contents = formatCommandsAsMarkdown(commands);

  // Add comments so users hopefully don't open PRs directly into expo/expo
  contents =
    `\n<!-- BEGIN GENERATED BLOCK. DO NOT MODIFY MANUALLY. https://github.com/expo/expo-cli/blob/main/packages/expo-cli/scripts/introspect.ts -->\n\n` +
    `> Based on \`expo-cli\` v${require('../package.json').version}\n\n` +
    contents +
    `\n<!-- END GENERATED BLOCK. DO NOT MODIFY MANUALLY. -->`;
  log(contents);
  pbcopy(contents);
} else if (['fig'].includes(process.argv[2])) {
  const runFig = () => {
    const branch = 'main';
    const ICON = {
      npm: 'fig://icon?type=npm',
      yarn: 'fig://icon?type=yarn',
      force: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/force.png`,
      alert: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/block.png`,
      android: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/android.png`,
      ios: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/apple.png`,
      string: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/string.png`,
      box: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/export.png`,
      scheme: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/scheme.png`,
      web: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/web.png`,
      workers: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/number.png`,
      credentials: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/list.png`,
      init: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/init.png`,
      start: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/play.png`,
      upgrade: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/upgrade.png`,
      device: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/devices.png`,
      skip: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/skip.png`,
      true: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/true.png`,
      false: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/false.png`,
      help: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/help.png`,
      url: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/url.png`,
      publish: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/publish.png`,
      webhooks: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/webhook.png`,
      webhooksAdd: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/webhook-add.png`,
      webhooksRemove: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/webhook-remove.png`,
      webhooksUpdate: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/webhook-update.png`,
      prebuild: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/prebuild.png`,
      download: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/download.png`,
      eject: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/eject.png`,
      doctor: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/doctor.png`,
      customize: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/customize.png`,
      diagnostics: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/diagnostics.png`,
      status: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/info.png`,
      number: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/number.png`,
      config: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/config.png`,
      lock: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/lock.png`,
      send: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/send.png`,
      tunnel: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/tunnel.png`,
      login: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/login.png`,
      logout: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/logout.png`,
      expo: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/expo.png`,
      info: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/info.png`,
      appstore: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/app-store.png`,
      playstore: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/play-store.png`,
      webpack: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/webpack.png`,
      metro: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/metro.png`,
      offline: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/offline.png`,
      export: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/export.png`,
      lan: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/lan.png`,
      localhost: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/localhost.png`,
      clear: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/clear.png`,
      minify: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/minify.png`,
      dev: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/dev.png`,
      register: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/register.png`,
      quiet: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/quiet.png`,
      verbose: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/verbose.png`,
      path: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/path.png`,
      key: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/key.png`,
      latest: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/latest.png`,
      publishRollback: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/publish-rollback.png`,
      push: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/push.png`,
      pushClear: `https://raw.githubusercontent.com/expo/expo-cli/${branch}/assets/fig/push-clear.png`,
    };

    const COMMAND_ICONS: Record<string, string> = {
      'build:ios': ICON.ios,
      'build:android': ICON.android,
      'build:web': ICON.webpack,
      'build:status': ICON.status,
      // 'bundle-assets': ICON.foobar,
      'client:ios': ICON.download,
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
      logout: ICON.logout,
      prebuild: ICON.prebuild,

      // 'prepare-detached-build': ICON.foobar,

      publish: ICON.publish,
      'publish:set': ICON.publish,
      'publish:rollback': ICON.publishRollback,
      'publish:history': ICON.publish,
      'publish:details': ICON.publish,

      'push:android:upload': ICON.push,
      'push:android:show': ICON.push,
      'push:android:clear': ICON.pushClear,

      register: ICON.register,
      'run:android': ICON.android,
      'run:ios': ICON.ios,
      send: ICON.send,
      start: ICON.start,
      'start:web': ICON.web,
      upgrade: ICON.upgrade,
      'upload:android': ICON.playstore,
      'upload:ios': ICON.appstore,
      url: ICON.url,
      'url:ipa': ICON.appstore,
      'url:apk': ICON.playstore,
      webhooks: ICON.webhooks,
      'webhooks:add': ICON.webhooksAdd,
      'webhooks:remove': ICON.webhooksRemove,
      'webhooks:update': ICON.webhooksUpdate,
      whoami: ICON.info,
    };

    const figSubcommands: FigSpec[] = [];

    const booleanArg: FigArg = {
      name: 'boolean',
      suggestions: [
        // { name: 'true', icon: ICON.true },
        // { name: 'false', icon: ICON.false },
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
      icon: ICON.info,
      priority: 1,
    };

    const clearOptionalProperties = (options: FigArg | FigArg[]): FigArg | FigArg[] => {
      if (Array.isArray(options)) {
        return options.map(option => clearOptionalProperties(option) as FigArg);
      }
      if (options.isOptional === false) {
        delete options.isOptional;
      }
      if (options.isVariadic === false) {
        delete options.isVariadic;
      }
      return options;
    };
    const simplifyArgsType = (options: FigArg | FigArg[]): FigArg | FigArg[] => {
      if (Array.isArray(options)) {
        options = options.map(option => simplifyArgsType(option) as FigArg);
        return options.length === 1 ? options[0] : options;
      }
      return options;
    };

    const getGeneratorArgs = (generator: string, args: Partial<FigArg> = {}): FigArg => ({
      generators: `_gen[\`${generator}\`]`,
      ...args,
    });

    const stripTrailingDot = (str: string): string => str.replace(/\.$/, '');
    const capitalizeFirst = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1);
    const formatDescription = (str: string): string =>
      capitalizeFirst(stripTrailingDot(stripAnsi(str)));

    for (const command of commands) {
      let priorityIndex = helpGroupOrder.findIndex(v => v === command.group);
      if (priorityIndex > -1) {
        priorityIndex = helpGroupOrder.length - priorityIndex;
      }

      const subcommandNames = [command.name, command.alias].filter(Boolean) as string[];
      const subcommand: FigSpec = {
        name: subcommandNames.length === 1 ? subcommandNames[0] : subcommandNames,
        hidden: command.group === 'internal',
        description: formatDescription(command.description),
        priority: 50 + priorityIndex,
        // fig uses `isOptional` instead of `required`
        args: (command.args || []).map(({ required, variadic, ...arg }) => {
          // `expo start [path]` is a common pattern in expo-cli, this defaults them to folders.
          const template = arg.name === 'path' ? 'folders' : undefined;

          return {
            isOptional: !required,
            isVariadic: variadic,
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
        const [, argName] = option.flags.match(/(?:\[|<)([\w|-||]+)(?:\]|>)/) || [];
        const isRequired = argName ? option.flags?.includes('<') : false;
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

        // Support enum suggestions: <ios|android>
        if (argName?.includes('|')) {
          const enumIcon = (name: string) => {
            if (!name) return undefined;
            if (name === 'ios') {
              return ICON.ios;
            } else if (name === 'simulator') {
              return ICON.device;
            } else if (name === 'android') {
              return ICON.android;
            }
            return undefined;
          };

          args.suggestions = argName.split('|').map(name => ({
            name,
            icon: enumIcon(name),
          }));
        }

        if (name.includes('--platform')) {
          args.name = 'platform';
        } else if (name[0] === '--config') {
          // config is deprecated so move it lower
        } else if (name[0] === '--max-workers') {
          args = getGeneratorArgs('max-workers', { ...args, name: 'Number of workers' });
        }

        if (command.name === 'run:ios') {
          if (name.includes('--configuration')) {
            args = getGeneratorArgs('xcode-configuration', args);
          } else if (name.includes('--scheme')) {
            args = getGeneratorArgs('xcode-scheme', args);
            // User should choose schemes before devices as schemes can filter out devices
          } else if (name.includes('--device')) {
            args = getGeneratorArgs('xcode-devices', { ...args, isOptional: false });
          }
        }

        const getOptionIcon = (option: OptionData) => {
          if (
            option.deprecated ||
            name.includes('--config') ||
            (name.includes('--target') && ['publish', 'export'].includes(command.name))
          ) {
            return ICON.alert;
          } else if (command.name.startsWith('run:') && name.includes('--no-bundler')) {
            return ICON.metro;
          } else if (name.includes('--variant')) {
            return ICON.string;
          } else if (option.flags.includes('-android')) {
            return ICON.android;
          } else if (option.flags.includes('-latest')) {
            return ICON.latest;
          } else if (option.flags.includes('-ios') || option.flags.includes('-apple')) {
            return ICON.ios;
          } else if (option.flags.includes('-no-') || option.flags.includes('-skip-')) {
            return ICON.skip;
          } else if (option.flags.includes('-npm') || option.flags.includes('-install')) {
            return ICON.npm;
          } else if (option.flags.includes('-yarn')) {
            return ICON.yarn;
          } else if (option.flags.includes('-name') || name.includes('--public-url')) {
            return ICON.string;
          } else if (name.includes('--yes')) {
            return ICON.true;
          } else if (name.includes('--scheme') && command.name !== 'run:ios') {
            return ICON.scheme;
          } else if (name.includes('--send-to')) {
            return ICON.send;
          } else if (name.includes('--quiet')) {
            return ICON.quiet;
          } else if (name.includes('--verbose')) {
            return ICON.verbose;
          } else if (name.includes('--tunnel')) {
            return ICON.tunnel;
          } else if (name.includes('--lan') || name.includes('--host')) {
            return ICON.lan;
          } else if (name.includes('--localhost')) {
            return ICON.localhost;
          } else if (name.includes('--minify')) {
            return ICON.minify;
          } else if (name.includes('--dev') || name.includes('--dev-client')) {
            return ICON.dev;
          } else if (
            option.flags.includes('-clear') ||
            option.flags.includes('-revoke') ||
            name.includes('--clear') ||
            name.includes('--clean')
          ) {
            return ICON.clear;
          } else if (name.includes('--web')) {
            return ICON.web;
          } else if (name.includes('--device')) {
            return ICON.device;
          } else if (name.includes('--template')) {
            return ICON.box;
          } else if (name.includes('--offline')) {
            return ICON.offline;
          } else if (name.includes('--https')) {
            return ICON.lock;
          } else if (name.includes('--max-workers')) {
            return ICON.workers;
          } else if (name.includes('--force')) {
            return ICON.force;
          } else if (name.includes('--port')) {
            return ICON.number;
          } else if (name.includes('--platform')) {
            return ICON.device;
          } else if (name.includes('--secret')) {
            return ICON.lock;
          } else if (option.flags.includes('-dump-')) {
            return ICON.export;
          } else if (option.flags.includes('-sdk')) {
            return ICON.expo;
          } else if (option.flags.includes('-count')) {
            return ICON.number;
          } else if (option.flags.includes('-key')) {
            return ICON.key;
          } else if (option.flags.includes('-dir') || option.flags.includes('-path')) {
            return ICON.path;
          }
          // Default to string icon
          return ICON.string;
        };

        const suboption: FigSpec = {
          name: name.length === 1 ? name[0] : name,
          description: formatDescription(option.description),
          args,
          icon: getOptionIcon(option),
          // ensure that command options are placed above path suggestions (+76)
          // priority: 76 + extraPriority,
        };
        // Move the deprecated --config property to the bottom
        if (
          name.includes('--config') ||
          // Move the deprecated target property down
          (name.includes('--target') && ['publish', 'export'].includes(command.name))
        ) {
          suboption.priority = 2;
        }
        subcommand.options!.push(suboption);

        // TODO: enum types (platform)
      }

      figSubcommands.push(subcommand);
    }

    const figSpec = {
      name: 'expo',
      // website favicon
      icon: ICON.expo,
      description:
        'Tools for creating, running, and deploying Universal Expo and React Native apps',
      options: [helpOption, versionOption],
      subcommands: figSubcommands.map(command => {
        if (command.args) {
          command.args = clearOptionalProperties(command.args);
          command.args = simplifyArgsType(command.args);
        }
        return command;
      }),
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
  
    const completionSpec: Fig.Spec = ${parsed};

    export default completionSpec;
    `;

    // Generate a schema for https://github.com/withfig/autocomplete

    log(contents);
    pbcopy(contents);
  };

  try {
    runFig();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  }
} else {
  const contents = JSON.stringify(commands);
  log(contents);
  pbcopy(contents);
}
