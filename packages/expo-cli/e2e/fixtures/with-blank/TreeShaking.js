import React from 'react';
import { Text } from 'react-native';

// This shouldn't be included in the final bundle
if (__DEV__) {
  // Include a large package
  require('@expo/vector-icons');
}

console.log('CONSOLE_LOG_IN_THE_PROJECT');

export default () => <Text>TreeShaking</Text>;
