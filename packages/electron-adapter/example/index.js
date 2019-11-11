import { activateKeepAwake } from 'expo-keep-awake';
import registerRootComponent from 'expo/build/launch/registerRootComponent';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// eslint-disable-next-line
if (__DEV__) {
  activateKeepAwake();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

function App() {
  return (
    <View style={styles.container}>
      <Text testID="basic-text">Open up App.js to start working on your app!</Text>
    </View>
  );
}

registerRootComponent(App);
