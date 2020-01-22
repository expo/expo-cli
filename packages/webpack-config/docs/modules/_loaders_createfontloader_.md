[@expo/webpack-config](../README.md) › ["loaders/createFontLoader"](_loaders_createfontloader_.md)

# Module: "loaders/createFontLoader"

## Index

### loaders Functions

* [createFontLoader](_loaders_createfontloader_.md#createfontloader)

## loaders Functions

###  createFontLoader

▸ **createFontLoader**(`projectRoot`: string, `includeModule`: function): *Rule*

*Defined in [packages/webpack-config/src/loaders/createFontLoader.ts:11](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/loaders/createFontLoader.ts#L11)*

Create a `Webpack.Rule` for loading fonts and including Expo vector icons.
Fonts will be loaded to `./fonts/[name].[ext]`.

**Parameters:**

▪ **projectRoot**: *string*

root project folder.

▪ **includeModule**: *function*

method for resolving a node module given its package name.

▸ (...`props`: string[]): *string*

**Parameters:**

Name | Type |
------ | ------ |
`...props` | string[] |

**Returns:** *Rule*
