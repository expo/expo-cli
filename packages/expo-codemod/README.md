# expo-codemod

`expo-codemod` is collection of codemods (transforms) for projects using the Expo SDK and a small command-line interface (CLI) for running the codemods.

The codemods can be used to transform JavaScript (.js, .jsx) and TypeScript (.ts, .tsx) files.

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
```

### Advanced usage

The CLI is a wrapper over [jscodeshift](https://github.com/facebook/jscodeshift). If you need more fine grained control of jscodeshift or parser options, you can also use the jscodeshift CLI directly. First install `expo-codemod` and `jscodeshift`:

```sh
yarn add --dev expo-codemod
yarn global add jscodeshift
```

You can pass the transform filename to jscodeshift using the `--transform` option:

```sh
jscodeshift --transform ./node_modules/expo-codemod/build/transforms/sdk33-imports.js --no-babel --parser ts src/**/*.ts
```

## Transforms

### sdk33-imports

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
