import { AppRegistry } from 'react-native';

import App from './App';
import { expo } from './app.json';

AppRegistry.registerComponent(expo.name, () => App);

const rootTag = document.getElementById('root');

AppRegistry.runApplication(expo.name, { rootTag });
