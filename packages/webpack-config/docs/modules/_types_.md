[@expo/webpack-config](../README.md) › ["types"](_types_.md)

# Module: "types"

## Index

### Interfaces

* [Arguments](../interfaces/_types_.arguments.md)
* [DevConfiguration](../interfaces/_types_.devconfiguration.md)
* [FilePaths](../interfaces/_types_.filepaths.md)
* [FilePathsFolder](../interfaces/_types_.filepathsfolder.md)

### Type aliases

* [AnyConfiguration](_types_.md#anyconfiguration)
* [Environment](_types_.md#environment)
* [InputEnvironment](_types_.md#inputenvironment)
* [Mode](_types_.md#mode)
* [Report](_types_.md#report)

## Type aliases

###  AnyConfiguration

Ƭ **AnyConfiguration**: *[DevConfiguration](../interfaces/_types_.devconfiguration.md) | WebpackConfiguration*

*Defined in [packages/webpack-config/src/types.ts:12](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/types.ts#L12)*

___

###  Environment

Ƭ **Environment**: *object*

*Defined in [packages/webpack-config/src/types.ts:35](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/types.ts#L35)*

#### Type declaration:

* **config**(): *object*

* **https**: *boolean*

* **info**: *boolean*

* **locations**: *[FilePaths](../interfaces/_types_.filepaths.md)*

* **mode**: *[Mode](_types_.md#mode)*

* **platform**: *"ios" | "android" | "web" | "electron"*

* **polyfill**? : *undefined | false | true*

* **projectRoot**: *string*

* **pwa**? : *undefined | false | true*

* **removeUnusedImportExports**? : *undefined | false | true*

* **report**? : *[Report](_types_.md#report)*

___

###  InputEnvironment

Ƭ **InputEnvironment**: *object*

*Defined in [packages/webpack-config/src/types.ts:14](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/types.ts#L14)*

#### Type declaration:

* **config**? : *undefined | object*

* **development**? : *undefined | false | true*

* **https**? : *undefined | false | true*

* **info**? : *undefined | false | true*

* **locations**? : *[FilePaths](../interfaces/_types_.filepaths.md)*

* **mode**? : *[Mode](_types_.md#mode)*

* **platform**? : *"ios" | "android" | "web" | "electron"*

* **polyfill**? : *undefined | false | true*

* **production**? : *undefined | false | true*

* **projectRoot**? : *undefined | string*

* **pwa**? : *undefined | false | true*

* **removeUnusedImportExports**? : *undefined | false | true*

* **report**? : *undefined | object*

___

###  Mode

Ƭ **Mode**: *"production" | "development" | "none"*

*Defined in [packages/webpack-config/src/types.ts:81](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/types.ts#L81)*

___

###  Report

Ƭ **Report**: *object*

*Defined in [packages/webpack-config/src/types.ts:49](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/types.ts#L49)*

#### Type declaration:

* **path**: *string*

* **reportFilename**: *string*

* **statsFilename**: *string*

* **verbose**: *boolean*
