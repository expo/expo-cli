import { registerRootComponent } from 'expo';
import { activateKeepAwake } from 'expo-keep-awake';

import App from './App';

// eslint-disable-next-line
if (__DEV__) {
  activateKeepAwake();
}

registerRootComponent(App);
