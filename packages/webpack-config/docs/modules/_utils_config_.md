[@expo/webpack-config](../README.md) › ["utils/config"](_utils_config_.md)

# Module: "utils/config"

## Index

### utils Functions

* [enableWithPropertyOrConfig](_utils_config_.md#enablewithpropertyorconfig)
* [overrideWithPropertyOrConfig](_utils_config_.md#overridewithpropertyorconfig)

## utils Functions

###  enableWithPropertyOrConfig

▸ **enableWithPropertyOrConfig**(`prop`: any, `config`: boolean | object, `merge`: boolean): *any*

*Defined in [packages/webpack-config/src/utils/config.ts:16](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/utils/config.ts#L16)*

Given a config option that could evalutate to true, config, or null; return a config.
e.g.
`polyfill: true` returns the `config`
`polyfill: {}` returns `{}`

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`prop` | any | - |
`config` | boolean &#124; object | - |
`merge` | boolean | false |

**Returns:** *any*

___

###  overrideWithPropertyOrConfig

▸ **overrideWithPropertyOrConfig**(`prop`: any, `config`: boolean | object, `merge`: boolean): *any*

*Defined in [packages/webpack-config/src/utils/config.ts:50](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/utils/config.ts#L50)*

Used for features that are enabled by default unless specified otherwise.

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`prop` | any | - |
`config` | boolean &#124; object | - |
`merge` | boolean | false |

**Returns:** *any*
