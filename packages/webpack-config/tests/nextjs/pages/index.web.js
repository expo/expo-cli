import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Constants from 'expo-constants';
import getenv from 'getenv';

export default function App() {
  return (
    <LinearGradient colors={['orange', 'blue']} style={styles.container}>
      <Text testID="basic-text">Open up App.js to start working on your app!</Text>
      <Text testID="expo-constants-manifest">{JSON.stringify(Constants.manifest)}</Text>
      {getenv.boolish('CI', false) && <Text testID="has-ci-text">Has CI env</Text>}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
