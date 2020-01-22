[@expo/webpack-config](../README.md) › ["env/getMode"](_env_getmode_.md)

# Module: "env/getMode"

## Index

### env Functions

* [getMode](_env_getmode_.md#getmode)

## env Functions

###  getMode

▸ **getMode**(`__namedParameters`: object): *[Mode](_types_.md#mode)*

*Defined in [packages/webpack-config/src/env/getMode.ts:9](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/env/getMode.ts#L9)*

Resolve the `mode` in a way that accounts for legacy treatment and environment variables.

mode -> production -> development -> process.env.NODE_ENV -> 'development'

**Parameters:**

▪ **__namedParameters**: *object*

Name | Type |
------ | ------ |
`development` | undefined &#124; false &#124; true |
`mode` | undefined &#124; "development" &#124; "production" &#124; "none" |
`production` | undefined &#124; false &#124; true |

**Returns:** *[Mode](_types_.md#mode)*
