[@expo/webpack-config](../README.md) › ["env/extensions"](_env_extensions_.md)

# Module: "env/extensions"

## Index

### env Functions

* [getModuleFileExtensions](_env_extensions_.md#getmodulefileextensions)

## env Functions

###  getModuleFileExtensions

▸ **getModuleFileExtensions**(...`platforms`: string[]): *string[]*

*Defined in [packages/webpack-config/src/env/extensions.ts:9](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/env/extensions.ts#L9)*

Get the platform specific platform extensions in the format that Webpack expects (with a dot prefix).

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`...platforms` | string[] | supported platforms in order of priority. ex: ios, android, web, native, electron, etc... |

**Returns:** *string[]*
