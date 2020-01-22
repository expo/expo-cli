[@expo/webpack-config](../README.md) › ["plugins/ExpoInterpolateHtmlPlugin"](../modules/_plugins_expointerpolatehtmlplugin_.md) › [ExpoInterpolateHtmlPlugin](_plugins_expointerpolatehtmlplugin_.expointerpolatehtmlplugin.md)

# Class: ExpoInterpolateHtmlPlugin

Add variables to the `index.html`

## Hierarchy

* InterpolateHtmlPlugin

  ↳ **ExpoInterpolateHtmlPlugin**

## Implements

* Plugin

## Index

### Constructors

* [constructor](_plugins_expointerpolatehtmlplugin_.expointerpolatehtmlplugin.md#constructor)

### Methods

* [apply](_plugins_expointerpolatehtmlplugin_.expointerpolatehtmlplugin.md#apply)
* [fromEnv](_plugins_expointerpolatehtmlplugin_.expointerpolatehtmlplugin.md#static-fromenv)

## Constructors

###  constructor

\+ **new ExpoInterpolateHtmlPlugin**(`htmlWebpackPlugin`: HtmlWebpackPlugin, `replacements`: object): *[ExpoInterpolateHtmlPlugin](_plugins_expointerpolatehtmlplugin_.expointerpolatehtmlplugin.md)*

*Inherited from [ExpoInterpolateHtmlPlugin](_plugins_expointerpolatehtmlplugin_.expointerpolatehtmlplugin.md).[constructor](_plugins_expointerpolatehtmlplugin_.expointerpolatehtmlplugin.md#constructor)*

Defined in node_modules/@types/react-dev-utils/InterpolateHtmlPlugin.d.ts:7

**Parameters:**

Name | Type |
------ | ------ |
`htmlWebpackPlugin` | HtmlWebpackPlugin |
`replacements` | object |

**Returns:** *[ExpoInterpolateHtmlPlugin](_plugins_expointerpolatehtmlplugin_.expointerpolatehtmlplugin.md)*

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

▸ **fromEnv**(`env`: Pick‹[Environment](../modules/_types_.md#environment), "mode" | "config" | "locations" | "projectRoot"›, `HtmlWebpackPlugin`: HtmlWebpackPlugin): *[ExpoInterpolateHtmlPlugin](_plugins_expointerpolatehtmlplugin_.expointerpolatehtmlplugin.md)*

*Defined in [packages/webpack-config/src/plugins/ExpoInterpolateHtmlPlugin.ts:23](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/plugins/ExpoInterpolateHtmlPlugin.ts#L23)*

**Parameters:**

Name | Type |
------ | ------ |
`env` | Pick‹[Environment](../modules/_types_.md#environment), "mode" &#124; "config" &#124; "locations" &#124; "projectRoot"› |
`HtmlWebpackPlugin` | HtmlWebpackPlugin |

**Returns:** *[ExpoInterpolateHtmlPlugin](_plugins_expointerpolatehtmlplugin_.expointerpolatehtmlplugin.md)*
