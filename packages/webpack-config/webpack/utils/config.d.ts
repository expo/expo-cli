export declare const DEFAULT_ALIAS: {
    'react-native$': string;
    '@react-native-community/netinfo': string;
    'react-native/Libraries/Image/AssetSourceResolver$': string;
    'react-native/Libraries/Image/assetPathUtils$': string;
    'react-native/Libraries/Image/resolveAssetSource$': string;
    'react-native/Libraries/Components/View/ViewStylePropTypes$': string;
    'react-native/Libraries/EventEmitter/RCTDeviceEventEmitter$': string;
    'react-native/Libraries/vendor/emitter/EventEmitter$': string;
    'react-native/Libraries/vendor/emitter/EventSubscriptionVendor$': string;
    'react-native/Libraries/EventEmitter/NativeEventEmitter$': string;
};
export declare function getModuleFileExtensions(...platforms: string[]): string[];
/**
 * Given a config option that could evalutate to true, config, or null; return a config.
 * e.g.
 * `polyfill: true` returns the `config`
 * `polyfill: {}` returns `{}`
 */
export declare function enableWithPropertyOrConfig(prop: any, config: boolean | {
    [key: string]: any;
}, merge?: boolean): any;
/**
 * Used for features that are enabled by default unless specified otherwise.
 */
export declare function overrideWithPropertyOrConfig(prop: any, config: boolean | {
    [key: string]: any;
}, merge?: boolean): any;
