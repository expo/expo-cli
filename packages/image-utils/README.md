# `@expo/image-utils`

A library for image processing functionality in Expo CLI.

## Installation

This library depends on `sharp-cli`. If the automatic installation of `sharp-cli` fails, you may see the following error in Expo CLI:

```
This command requires version <version> of `sharp-cli`.
You can install it using `npm install -g sharp-cli@$<version>`

For prerequisites, see: https://sharp.dimens.io/en/stable/install/#prerequisites
```

To fix this error, you can install `sharp-cli` yourself. First check that you have all the platform specific [prerequisites for the `sharp` library](https://sharp.dimens.io/en/stable/install/#prerequisites). Then install `sharp-cli` **globally**:

```
npm install -g sharp-cli
```

`@expo/image-utils` will automatically find the global `sharp` command and use that.
