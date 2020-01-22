[@expo/webpack-config](../README.md) › ["plugins/ExpoHtmlWebpackPlugin"](../modules/_plugins_expohtmlwebpackplugin_.md) › [ExpoHtmlWebpackPlugin](_plugins_expohtmlwebpackplugin_.expohtmlwebpackplugin.md)

# Class: ExpoHtmlWebpackPlugin

Generates an `index.html` file with the <script> injected.

## Hierarchy

* HtmlWebpackPlugin

  ↳ **ExpoHtmlWebpackPlugin**

## Implements

* Plugin

## Index

### Interfaces

* [Hooks](../interfaces/_plugins_expohtmlwebpackplugin_.expohtmlwebpackplugin.hooks.md)
* [Options](../interfaces/_plugins_expohtmlwebpackplugin_.expohtmlwebpackplugin.options.md)
* [TemplateParametersAssets](../interfaces/_plugins_expohtmlwebpackplugin_.expohtmlwebpackplugin.templateparametersassets.md)

### Type aliases

* [Config](_plugins_expohtmlwebpackplugin_.expohtmlwebpackplugin.md#static-config)
* [MinifyConfig](_plugins_expohtmlwebpackplugin_.expohtmlwebpackplugin.md#static-minifyconfig)
* [MinifyOptions](_plugins_expohtmlwebpackplugin_.expohtmlwebpackplugin.md#static-minifyoptions)

### Constructors

* [constructor](_plugins_expohtmlwebpackplugin_.expohtmlwebpackplugin.md#constructor)

### Methods

* [apply](_plugins_expohtmlwebpackplugin_.expohtmlwebpackplugin.md#apply)

## Type aliases

### `Static` Config

Ƭ **Config**: *[Options](../interfaces/_plugins_expohtmlwebpackplugin_.expohtmlwebpackplugin.options.md)*

Defined in node_modules/@types/html-webpack-plugin/index.d.ts:185

**`deprecated`** use Options

___

### `Static` MinifyConfig

Ƭ **MinifyConfig**: *[MinifyOptions](_plugins_expohtmlwebpackplugin_.expohtmlwebpackplugin.md#static-minifyoptions)*

Defined in node_modules/@types/html-webpack-plugin/index.d.ts:183

**`deprecated`** use MinifyOptions

___

### `Static` MinifyOptions

Ƭ **MinifyOptions**: *HtmlMinifierOptions*

Defined in node_modules/@types/html-webpack-plugin/index.d.ts:22

## Constructors

###  constructor

\+ **new ExpoHtmlWebpackPlugin**(`env`: [Environment](../modules/_types_.md#environment)): *[ExpoHtmlWebpackPlugin](_plugins_expohtmlwebpackplugin_.expohtmlwebpackplugin.md)*

*Overrides void*

*Defined in [packages/webpack-config/src/plugins/ExpoHtmlWebpackPlugin.ts:25](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/plugins/ExpoHtmlWebpackPlugin.ts#L25)*

**Parameters:**

Name | Type |
------ | ------ |
`env` | [Environment](../modules/_types_.md#environment) |

**Returns:** *[ExpoHtmlWebpackPlugin](_plugins_expohtmlwebpackplugin_.expohtmlwebpackplugin.md)*

## Methods

###  apply

▸ **apply**(`compiler`: Compiler): *void*

*Inherited from [ExpoHtmlWebpackPlugin](_plugins_expohtmlwebpackplugin_.expohtmlwebpackplugin.md).[apply](_plugins_expohtmlwebpackplugin_.expohtmlwebpackplugin.md#apply)*

*Overrides [ExpoDefinePlugin](_plugins_expodefineplugin_.expodefineplugin.md).[apply](_plugins_expodefineplugin_.expodefineplugin.md#apply)*

Defined in node_modules/@types/html-webpack-plugin/index.d.ts:18

**Parameters:**

Name | Type |
------ | ------ |
`compiler` | Compiler |

**Returns:** *void*
