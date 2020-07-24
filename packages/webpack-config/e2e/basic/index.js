import { activateKeepAwake } from 'expo-keep-awake';
import registerRootComponent from 'expo/build/launch/registerRootComponent';

import App from './App';

// eslint-disable-next-line
if (__DEV__) {
  activateKeepAwake();
}

registerRootComponent(App);
