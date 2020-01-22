[@expo/webpack-config](../README.md) › ["utils/search"](_utils_search_.md)

# Module: "utils/search"

## Index

### utils Functions

* [conditionMatchesFile](_utils_search_.md#conditionmatchesfile)
* [findLoader](_utils_search_.md#findloader)
* [getLoaders](_utils_search_.md#getloaders)
* [getLoadersFromRules](_utils_search_.md#getloadersfromrules)
* [getPlugins](_utils_search_.md#getplugins)
* [getPluginsByName](_utils_search_.md#getpluginsbyname)
* [getRules](_utils_search_.md#getrules)
* [getRulesAsItems](_utils_search_.md#getrulesasitems)
* [getRulesByMatchingFiles](_utils_search_.md#getrulesbymatchingfiles)
* [getRulesFromRules](_utils_search_.md#getrulesfromrules)
* [isEntry](_utils_search_.md#isentry)
* [isRuleSetItem](_utils_search_.md#isrulesetitem)
* [isRuleSetLoader](_utils_search_.md#isrulesetloader)
* [resolveEntryAsync](_utils_search_.md#resolveentryasync)
* [resolveRuleSetUse](_utils_search_.md#resolverulesetuse)
* [rulesMatchAnyFiles](_utils_search_.md#rulesmatchanyfiles)

## utils Functions

###  conditionMatchesFile

▸ **conditionMatchesFile**(`condition`: RuleSetCondition | undefined, `file`: string): *boolean*

*Defined in [packages/webpack-config/src/utils/search.ts:202](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/utils/search.ts#L202)*

**Parameters:**

Name | Type |
------ | ------ |
`condition` | RuleSetCondition &#124; undefined |
`file` | string |

**Returns:** *boolean*

___

###  findLoader

▸ **findLoader**(`loaderName`: string, `rules`: RuleSetRule[]): *RuleSetRule | null*

*Defined in [packages/webpack-config/src/utils/search.ts:48](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/utils/search.ts#L48)*

**Parameters:**

Name | Type |
------ | ------ |
`loaderName` | string |
`rules` | RuleSetRule[] |

**Returns:** *RuleSetRule | null*

___

###  getLoaders

▸ **getLoaders**(`config`: [AnyConfiguration](_types_.md#anyconfiguration)): *LoaderItem[]*

*Defined in [packages/webpack-config/src/utils/search.ts:127](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/utils/search.ts#L127)*

**Parameters:**

Name | Type |
------ | ------ |
`config` | [AnyConfiguration](_types_.md#anyconfiguration) |

**Returns:** *LoaderItem[]*

___

###  getLoadersFromRules

▸ **getLoadersFromRules**(`rules`: RuleItem[]): *LoaderItem[]*

*Defined in [packages/webpack-config/src/utils/search.ts:107](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/utils/search.ts#L107)*

**Parameters:**

Name | Type |
------ | ------ |
`rules` | RuleItem[] |

**Returns:** *LoaderItem[]*

___

###  getPlugins

▸ **getPlugins**(`__namedParameters`: object): *PluginItem[]*

*Defined in [packages/webpack-config/src/utils/search.ts:243](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/utils/search.ts#L243)*

**Parameters:**

▪ **__namedParameters**: *object*

Name | Type | Default |
------ | ------ | ------ |
`plugins` | Plugin‹›[] | [] |

**Returns:** *PluginItem[]*

___

###  getPluginsByName

▸ **getPluginsByName**(`config`: [AnyConfiguration](_types_.md#anyconfiguration), `name`: string): *PluginItem[]*

*Defined in [packages/webpack-config/src/utils/search.ts:253](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/utils/search.ts#L253)*

**Parameters:**

Name | Type |
------ | ------ |
`config` | [AnyConfiguration](_types_.md#anyconfiguration) |
`name` | string |

**Returns:** *PluginItem[]*

___

###  getRules

▸ **getRules**(`config`: [AnyConfiguration](_types_.md#anyconfiguration)): *RuleItem[]*

*Defined in [packages/webpack-config/src/utils/search.ts:79](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/utils/search.ts#L79)*

**Parameters:**

Name | Type |
------ | ------ |
`config` | [AnyConfiguration](_types_.md#anyconfiguration) |

**Returns:** *RuleItem[]*

___

###  getRulesAsItems

▸ **getRulesAsItems**(`rules`: RuleSetRule[]): *RuleItem[]*

*Defined in [packages/webpack-config/src/utils/search.ts:67](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/utils/search.ts#L67)*

**Parameters:**

Name | Type |
------ | ------ |
`rules` | RuleSetRule[] |

**Returns:** *RuleItem[]*

___

###  getRulesByMatchingFiles

▸ **getRulesByMatchingFiles**(`config`: [AnyConfiguration](_types_.md#anyconfiguration), `files`: string[]): *object*

*Defined in [packages/webpack-config/src/utils/search.ts:151](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/utils/search.ts#L151)*

**Parameters:**

Name | Type |
------ | ------ |
`config` | [AnyConfiguration](_types_.md#anyconfiguration) |
`files` | string[] |

**Returns:** *object*

* \[ **key**: *string*\]: RuleItem[]

___

###  getRulesFromRules

▸ **getRulesFromRules**(`rules`: RuleSetRule[]): *RuleSetRule[]*

*Defined in [packages/webpack-config/src/utils/search.ts:89](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/utils/search.ts#L89)*

**Parameters:**

Name | Type |
------ | ------ |
`rules` | RuleSetRule[] |

**Returns:** *RuleSetRule[]*

___

###  isEntry

▸ **isEntry**(`arg`: any): *arg is Entry*

*Defined in [packages/webpack-config/src/utils/search.ts:285](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/utils/search.ts#L285)*

**Parameters:**

Name | Type |
------ | ------ |
`arg` | any |

**Returns:** *arg is Entry*

___

###  isRuleSetItem

▸ **isRuleSetItem**(`loader`: RuleSetUse): *loader is RuleSetUseItem*

*Defined in [packages/webpack-config/src/utils/search.ts:267](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/utils/search.ts#L267)*

**Parameters:**

Name | Type |
------ | ------ |
`loader` | RuleSetUse |

**Returns:** *loader is RuleSetUseItem*

___

###  isRuleSetLoader

▸ **isRuleSetLoader**(`loader`: RuleSetUse): *loader is RuleSetLoader*

*Defined in [packages/webpack-config/src/utils/search.ts:276](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/utils/search.ts#L276)*

**Parameters:**

Name | Type |
------ | ------ |
`loader` | RuleSetUse |

**Returns:** *loader is RuleSetLoader*

___

###  resolveEntryAsync

▸ **resolveEntryAsync**(`arg`: any): *Promise‹Entry›*

*Defined in [packages/webpack-config/src/utils/search.ts:302](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/utils/search.ts#L302)*

**Parameters:**

Name | Type |
------ | ------ |
`arg` | any |

**Returns:** *Promise‹Entry›*

___

###  resolveRuleSetUse

▸ **resolveRuleSetUse**(`rule?`: RuleSetUse | RuleSetUse[]): *ResolvedRuleSet[]*

*Defined in [packages/webpack-config/src/utils/search.ts:179](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/utils/search.ts#L179)*

**Parameters:**

Name | Type |
------ | ------ |
`rule?` | RuleSetUse &#124; RuleSetUse[] |

**Returns:** *ResolvedRuleSet[]*

___

###  rulesMatchAnyFiles

▸ **rulesMatchAnyFiles**(`config`: [AnyConfiguration](_types_.md#anyconfiguration), `files`: string[]): *boolean*

*Defined in [packages/webpack-config/src/utils/search.ts:169](https://github.com/expo/expo-cli/blob/61a3bbc1/packages/webpack-config/src/utils/search.ts#L169)*

**Parameters:**

Name | Type |
------ | ------ |
`config` | [AnyConfiguration](_types_.md#anyconfiguration) |
`files` | string[] |

**Returns:** *boolean*
