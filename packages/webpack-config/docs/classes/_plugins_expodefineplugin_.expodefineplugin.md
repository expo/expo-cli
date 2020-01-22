[@expo/webpack-config](../README.md) › ["plugins/ExpoDefinePlugin"](../modules/_plugins_expodefineplugin_.md) › [ExpoDefinePlugin](_plugins_expodefineplugin_.expodefineplugin.md)

# Class: ExpoDefinePlugin

Required for `expo-constants` https://docs.expo.io/versions/latest/sdk/constants/
This surfaces the `app.json` (config) as an environment variable which is then parsed by `expo-constants`.

## Hierarchy

* DefinePlugin

  ↳ **ExpoDefinePlugin**

## Implements

* Plugin

## Index

### Constructors

* [constructor](_plugins_expodefineplugin_.expodefineplugin.md#constructor)

### Properties

* [createClientEnvironment](_plugins_expodefineplugin_.expodefineplugin.md#static-createclientenvironment)

### Methods

* [apply](_plugins_expodefineplugin_.expodefineplugin.md#apply)
* [fromEnv](_plugins_expodefineplugin_.expodefineplugin.md#static-fromenv)

## Constructors

###  constructor

\+ **new ExpoDefinePlugin**(`__namedParameters`: object): *[ExpoDefinePlugin](_plugins_expodefineplugin_.expodefineplugin.md)*

*Overrides void*

*Defined in [packages/webpack-config/src/plugins/ExpoDefinePlugin.ts:88](https://github.com/expo/expo-cli/blob/bafc13a2/packages/webpack-config/src/plugins/ExpoDefinePlugin.ts#L88)*

**Parameters:**

▪ **__namedParameters**: *object*

Name | Type |
------ | ------ |
`config` | object |
`mode` | "development" &#124; "production" &#124; "none" |
`productionManifestPath` | string |
`publicUrl` | string |

**Returns:** *[ExpoDefinePlugin](_plugins_expodefineplugin_.expodefineplugin.md)*

## Properties

### `Static` createClientEnvironment

▪ **createClientEnvironment**: *createClientEnvironment* = createClientEnvironment

*Defined in [packages/webpack-config/src/plugins/ExpoDefinePlugin.ts:73](https://github.com/expo/expo-cli/blob/bafc13a2/packages/webpack-config/src/plugins/ExpoDefinePlugin.ts#L73)*

## Methods

###  apply

▸ **apply**(`compiler`: Compiler): *void*

*Inherited from [ExpoDefinePlugin](_plugins_expodefineplugin_.expodefineplugin.md).[apply](_plugins_expodefineplugin_.expodefineplugin.md#apply)*

Defined in node_modules/@types/webpack/index.d.ts:1158

**Parameters:**

Name | Type |
------ | ------ |
`compiler` | Compiler |

**Returns:** *void*

___

### `Static` fromEnv

▸ **fromEnv**(`env`: Pick‹[Environment](../modules/_types_.md#environment), "projectRoot" | "mode" | "config" | "locations"›): *[ExpoDefinePlugin](_plugins_expodefineplugin_.expodefineplugin.md)*

*Defined in [packages/webpack-config/src/plugins/ExpoDefinePlugin.ts:74](https://github.com/expo/expo-cli/blob/bafc13a2/packages/webpack-config/src/plugins/ExpoDefinePlugin.ts#L74)*

**Parameters:**

Name | Type |
------ | ------ |
`env` | Pick‹[Environment](../modules/_types_.md#environment), "projectRoot" &#124; "mode" &#124; "config" &#124; "locations"› |

**Returns:** *[ExpoDefinePlugin](_plugins_expodefineplugin_.expodefineplugin.md)*
