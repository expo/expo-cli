
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

* [constructor](expodefineplugin.md#constructor)

### Properties

* [createClientEnvironment](expodefineplugin.md#static-createclientenvironment)

### Methods

* [apply](expodefineplugin.md#apply)
* [fromEnv](expodefineplugin.md#static-fromenv)

## Constructors

###  constructor

\+ **new ExpoDefinePlugin**(`__namedParameters`: object): *[ExpoDefinePlugin](expodefineplugin.md)*

*Overrides void*

**Parameters:**

▪ **__namedParameters**: *object*

Name | Type |
------ | ------ |
`config` | object |
`mode` | "development" &#124; "production" &#124; "none" |
`productionManifestPath` | string |
`publicUrl` | string |

**Returns:** *[ExpoDefinePlugin](expodefineplugin.md)*

## Properties

### `Static` createClientEnvironment

▪ **createClientEnvironment**: *createClientEnvironment* = createClientEnvironment

## Methods

###  apply

▸ **apply**(`compiler`: Compiler): *void*

*Inherited from [ExpoDefinePlugin](expodefineplugin.md).[apply](expodefineplugin.md#apply)*

**Parameters:**

Name | Type |
------ | ------ |
`compiler` | Compiler |

**Returns:** *void*

___

### `Static` fromEnv

▸ **fromEnv**(`env`: Pick‹[Environment](../README.md#environment), "projectRoot" | "mode" | "config" | "locations"›): *[ExpoDefinePlugin](expodefineplugin.md)*

**Parameters:**

Name | Type |
------ | ------ |
`env` | Pick‹[Environment](../README.md#environment), "projectRoot" &#124; "mode" &#124; "config" &#124; "locations"› |

**Returns:** *[ExpoDefinePlugin](expodefineplugin.md)*
