/* global __DEV__ */
import registerRootComponent from 'expo/build/launch/registerRootComponent';
import { activateKeepAwake } from 'expo-keep-awake';

import App from './App';

if (__DEV__) {
  activateKeepAwake();
}

registerRootComponent(App);
