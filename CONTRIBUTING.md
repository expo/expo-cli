# Contributing to Expo CLI

## How to contribute

You can contribute to Expo development tools in various ways, including:

- [Reporting bugs or issues](https://github.com/expo/expo-cli/issues/new) on GitHub. Please make sure to include fill in all the details in the issue template to make sure the issue can be addressed as quickly as possible.
- [Submitting improvements to the documentation](https://github.com/expo/expo/tree/main/docs). Updates, enhancements, new guides, spelling fixes...
- Helping other people on the [forums](https://forums.expo.dev).
- Looking at existing [issues](https://github.com/expo/expo-cli/issues) and adding more information, particularly helping to reproduce the issues.
- [Submitting a pull request](#submitting-a-pull-request) with a bug fix or an improvement.

## Expo CLI repository

The [Expo CLI GitHub repository](https://github.com/expo/expo-cli) contains the packages that make up Expo CLI.

### Packages

- `expo-cli`: Expo CLI is the command line interface for developing, building and sharing Expo apps.
- `@expo/dev-tools`: the web-based graphical user interface included in Expo CLI for quickly viewing logs, connecting testing devices, deploying updates and more.
- `xdl`: the Expo development library is a dependency of both the CLI and Dev Tools user interfaces, doing all the heavy lifting behind the scenes.
- `@expo/schemer`: a library for validating [Expo configuration files](https://docs.expo.dev/workflow/configuration/).
- `@expo/json-file`: a library for reading and writing JSON files.
- `@expo/osascript`: a library for working with `osascript` which runs AppleScript code on macOS.
- `@expo/traveling-fastlane-darwin`/`@expo/traveling-fastlane-linux`: JavaScript wrappers for managing iOS certs, based on [Fastlane](https://fastlane.tools), which is a Ruby based app automation tool.

### Branches

The `main` branch of the repository should be kept releasable at any time. This way we can continuously deploy fixes and improvements without costly managing of different branches and issues will be noticed and fixed quickly. This also ensures other contributors can check out the latest version from GitHub and work on it with minimal disruption from other features in progress.

Keeping the `main` releasable means that changes merged to it need to be:

- **Backwards compatible**: Expo CLI should work with _every currently supported Expo SDK version_. If the code you're adding depends on a feature only present in newer or unreleased SDK versions, it needs to check which SDK version is being used and not assume the latest version is being used.
- **Non-breaking**: If code that is unreleasable or fails the test suite ends up in `main`, it should be reverted.
- **Tested**: Always include a test plan in pull requests. Do not merge code that doesn't pass all automated tests.

## Setting up the repository for development

1. Clone the repository.
2. Run `yarn`. (Installs dependencies and links packages in the workspace.)
3. Run `git config commit.template .github/.COMMIT_TEMPLATE` (Sets you up with our commit message template)
4. Run `yarn build` to build all packages before start watching. You may need to run `yarn build` in packages/dev-server once since it's not a purely Node.js project.
5. Run `yarn start` in the root folder. (Start watching and automatically re-building packages when there are new changes.)
6. Open another terminal at the same top level folder that `expo-cli` repository is located, then run `node ~/code/expo-cli/packages/expo-cli/bin/expo.js init` (you may even want to create an alias to this file), if everything is correct, it should create the repository `my-app`.
7. Finally, run `node ~/code/expo-cli/packages/expo-cli/bin/expo.js start` inside the `my-app` repository you have just created. If it starts, the `expo-cli` repository is correctly configured and you're ready for start developing.

We highly recommend you setup an alias for expo-cli so you can try it in projects all around your computer. Open your `.zshrc` or other config file and add:

```
alias expod="/Users/yourname/path/to/expo-cli/packages/expo-cli/bin/expo.js"
```

Then use it with `expod` like `expod start`. You can also setup a debug version:

```
alias expod-inspect="node --inspect /Users/yourname/path/to/cli/packages/expo-cli/bin/expo.js"
```

Then you can run it, and visit `chrome://inspect/#devices` in Chrome, and press "Open dedicated DevTools for Node" to get a debugger attached to your process. When debugging the CLI, you'll want to disable workers whenever possible, this will make all code run on the same thread, this is mostly applicable to the `start` command, i.e. `expo-inspect start --max-workers 0`.

- When testing changes to Babel, be sure to use the `--clear` flag so you don't get cached results.
- When testing bundle loading, it can often be faster to open the project in the browser: `http://localhost:19000/` -> bundleUrl -> trigger bundling.
- When testing `@expo/webpack-config` or `@expo/metro-config`, ensure your project doesn't have a local `webpack.config.js` or `metro.config.js` as this will override your local changes.

## Submitting a pull request

To submit a pull request:

1. Fork the [repository](https://github.com/expo/expo-cli) and create a feature branch. (Existing contributors can create feature branches without forking. Prefix the branch name with `@your-github-username/`.)
2. Write the description of your pull request. Make sure to include a test plan and test your changes.
3. Make sure all tests pass on CircleCI.
4. Wait for a review and adjust the code if necessary.

## Publishing a release

To publish a new release, run this command (you must have two-factor authentication enabled for npm):

```
./scripts/publish.js
```

The command will bump the versions of all packages with changes since the previous release and publish them in the correct order. For each changed package, it will ask, if the changes require a new _major_ version (breaking changes), _minor_ version (new backwards compatible functionality) or just a _patch_ version (backwards compatible bug fixes).

After publishing, there are a few more manual steps:

1. Update the changelog:
   1. `git log` to find the SHA of the previous publish commit
   2. Insert the output from `./scripts/changelog-draft.js <sha>` into the changelog.
   3. Rearrange/edit the entries from bug fixes into appropriate categories.
2. Install the version just published manually (`expo-cli@version`), run a quick smoke test (create project, run it, eject it, run it).
3. Promote the version just published to latest: `npm dist-tag add expo-cli@version latest`

### Canary release

If you wish to publish a canary version, please run:

```
./scripts/publish.js --bump prerelease
```
