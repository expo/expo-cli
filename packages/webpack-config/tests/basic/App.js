import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text } from 'react-native';

export default function App() {
  return (
    <LinearGradient colors={['orange', 'blue']} style={styles.container}>
      <Text testID="basic-text">Open up App.js to start working on your app!</Text>
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
