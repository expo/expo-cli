# expo-codemod

`expo-codemod` is collection of codemods (transforms) for projects using the Expo SDK and a small command-line interface (CLI) for running the codemods.

The codemods can be used to transform JavaScript (.js, .jsx) and TypeScript (.ts, .tsx) files.

## Installation

You can run `expo-codemod` using `npx` without having to install it (Node.js 8.x, 10.x or 12.x is required):

```
npx expo-codemod
```

Alternatively, you can install it globally:

```
npm install --global expo-codemod
```

(Installing with `yarn global add` works too.)

## Usage

```sh
npx expo-codemod <transform> <paths...>
```

```
Options:
  <transform>                      (required) name of transform to apply to files
                                   (see a list of transforms available below)
  <paths...>                       one or more paths or globs (e.g. src/**/*.js) of sources to transform
                                   files in .gitignore are ignored by default
  -h, --help                       print this help message
  -p, --parser <babel|flow|ts|tsx> parser to use to parse the source files
                                   (default: babel, ts or tsx based on the file extension)

Transforms available:
  sdk33-imports
  sdk37-imports
  sdk41-async-storage
```

For example, to apply the `sdk33-imports` transform to all source files in the `src` folder, run:

```
npx expo-codemod sdk33-imports src
```

You can also use glob patterns (make sure to wrap the patterns in quotes):

```
npx expo-codemod sdk33-imports '**/*.js' '**/*.{ts,tsx}'
```

### Advanced usage with jscodeshift

The CLI is a wrapper over [jscodeshift](https://github.com/facebook/jscodeshift). If you need more fine grained control of jscodeshift or parser options, you can also use the jscodeshift CLI directly. First install `expo-codemod` and `jscodeshift`:

```sh
npm install --save-dev expo-codemod
npm install --global jscodeshift
```

You can pass the transform filename to jscodeshift using the `--transform` option, for example:

```sh
jscodeshift --transform ./node_modules/expo-codemod/build/transforms/sdk33-imports.js --no-babel --ignore-config .gitignore .
```

Read more about jscodeshift options [here](https://github.com/facebook/jscodeshift#usage-cli).

## Troubleshooting

### Custom babel.config.js not being used

As per [#676](https://github.com/expo/expo-cli/issues/676#issuecomment-505793327) you can pass in the `--parser=flow` option.

## Transforms

### `sdk33-imports`

_Used to migrate a project from SDK 32 to SDK 33._

Transforms imports from the `expo` package that were deprecated in Expo SDK 33 to imports from the individual packages.

#### Example

Input:

```js
import { Accelerometer, GestureHandler, MapView } from 'expo';
```

Output:

```js
import { Accelerometer } from 'expo-sensors';
import * as GestureHandler from 'react-native-gesture-handler';
import MapView from 'react-native-maps';
```

### `sdk37-imports`

_Used to migrate a project from SDK 36 to SDK 37._

Transforms imports of `AuthSession` and `ScreenOrientation` that were extracted out from the `expo` package to `expo-auth-session` and `expo-screen-orientation` packages for SDK 37.

#### Example

Input:

```js
import { AuthSession, ScreenOrientation } from 'expo';
```

Output:

```js
import * as AuthSession from 'expo-auth-session';
import * as ScreenOrientation from 'expo-screen-orientation';
```

### `sdk41-async-storage`

_Used to migrate a project from SDK 40 to SDK 41._

Transforms imports of the renamed package `@react-native-community/async-storage` to `@react-native-async-storage/async-storage`.

#### Example

Input:

```js
import AsyncStorage from '@react-native-community/async-storage';
```

Output:

```js
import AsyncStorage from '@react-native-async-storage/async-storage';
```
