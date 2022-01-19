// @ts-ignore
import DeviceEventEmitter from 'react-native-web/dist/exports/DeviceEventEmitter';
// import { DeviceEventEmitter } from 'react-native';
// @ts-ignore
import RCTEventEmitter from 'react-native-web/dist/vendor/react-native/emitter/EventEmitter';

/**
 * This emitter is used for sending synthetic native events to listeners
 * registered in the API layer with `NativeEventEmitter`.
 */
class SyntheticPlatformEmitter {
  _emitter = new RCTEventEmitter(DeviceEventEmitter.sharedSubscriber);

  emit(eventName: string, props: any): void {
    this._emitter.emit(eventName, props);
  }
}

export default new SyntheticPlatformEmitter();
