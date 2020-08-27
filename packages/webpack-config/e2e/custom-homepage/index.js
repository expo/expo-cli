import * as React from 'react';
import { AppRegistry, View } from 'react-native';

const App = () => <View testID="e2e-default-view" />;
AppRegistry.registerComponent('main', () => App);

const rootTag = document.getElementById('root');
AppRegistry.runApplication('main', { rootTag });
