import { registerRootComponent } from 'expo';
import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

registerRootComponent(() => (
  <View style={styles.container}>
    <Text style={{ color: 'red', fontSize: 36 }} testID="basic-text">
      Open up App.js to start working on your app!
    </Text>
  </View>
));
