
# Class: ExpoInterpolateHtmlPlugin

## Hierarchy

* InterpolateHtmlPlugin

  ↳ **ExpoInterpolateHtmlPlugin**

## Implements

* Plugin

## Index

### Constructors

* [constructor](expointerpolatehtmlplugin.md#constructor)

### Methods

* [apply](expointerpolatehtmlplugin.md#apply)
* [fromEnv](expointerpolatehtmlplugin.md#static-fromenv)

## Constructors

###  constructor

\+ **new ExpoInterpolateHtmlPlugin**(`htmlWebpackPlugin`: HtmlWebpackPlugin, `replacements`: object): *[ExpoInterpolateHtmlPlugin](expointerpolatehtmlplugin.md)*

*Inherited from [ExpoInterpolateHtmlPlugin](expointerpolatehtmlplugin.md).[constructor](expointerpolatehtmlplugin.md#constructor)*

**Parameters:**

Name | Type |
------ | ------ |
`htmlWebpackPlugin` | HtmlWebpackPlugin |
`replacements` | object |

**Returns:** *[ExpoInterpolateHtmlPlugin](expointerpolatehtmlplugin.md)*

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

▸ **fromEnv**(`env`: Pick‹[Environment](../README.md#environment), "mode" | "config" | "locations" | "projectRoot"›, `HtmlWebpackPlugin`: HtmlWebpackPlugin): *[ExpoInterpolateHtmlPlugin](expointerpolatehtmlplugin.md)*

**Parameters:**

Name | Type |
------ | ------ |
`env` | Pick‹[Environment](../README.md#environment), "mode" &#124; "config" &#124; "locations" &#124; "projectRoot"› |
`HtmlWebpackPlugin` | HtmlWebpackPlugin |

**Returns:** *[ExpoInterpolateHtmlPlugin](expointerpolatehtmlplugin.md)*
