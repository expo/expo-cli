
# Class: ExpoHtmlWebpackPlugin

## Hierarchy

* HtmlWebpackPlugin

  ↳ **ExpoHtmlWebpackPlugin**

## Implements

* Plugin

## Index

### Interfaces

* [Hooks](../interfaces/expohtmlwebpackplugin.hooks.md)
* [Options](../interfaces/expohtmlwebpackplugin.options.md)
* [TemplateParametersAssets](../interfaces/expohtmlwebpackplugin.templateparametersassets.md)

### Type aliases

* [Config](expohtmlwebpackplugin.md#static-config)
* [MinifyConfig](expohtmlwebpackplugin.md#static-minifyconfig)
* [MinifyOptions](expohtmlwebpackplugin.md#static-minifyoptions)

### Constructors

* [constructor](expohtmlwebpackplugin.md#constructor)

### Methods

* [apply](expohtmlwebpackplugin.md#apply)

## Type aliases

### `Static` Config

Ƭ **Config**: *[Options](../interfaces/expohtmlwebpackplugin.options.md)*

**`deprecated`** use Options

___

### `Static` MinifyConfig

Ƭ **MinifyConfig**: *[MinifyOptions](expohtmlwebpackplugin.md#static-minifyoptions)*

**`deprecated`** use MinifyOptions

___

### `Static` MinifyOptions

Ƭ **MinifyOptions**: *HtmlMinifierOptions*

## Constructors

###  constructor

\+ **new ExpoHtmlWebpackPlugin**(`env`: [Environment](../README.md#environment)): *[ExpoHtmlWebpackPlugin](expohtmlwebpackplugin.md)*

*Overrides void*

**Parameters:**

Name | Type |
------ | ------ |
`env` | [Environment](../README.md#environment) |

**Returns:** *[ExpoHtmlWebpackPlugin](expohtmlwebpackplugin.md)*

## Methods

###  apply

▸ **apply**(`compiler`: Compiler): *void*

*Inherited from [ExpoHtmlWebpackPlugin](expohtmlwebpackplugin.md).[apply](expohtmlwebpackplugin.md#apply)*

*Overrides [ExpoDefinePlugin](expodefineplugin.md).[apply](expodefineplugin.md#apply)*

**Parameters:**

Name | Type |
------ | ------ |
`compiler` | Compiler |

**Returns:** *void*
