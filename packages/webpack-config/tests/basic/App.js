import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { boolish } from 'getenv';

function AspectView(props) {
  const [layout, setLayout] = React.useState(null);

  const { aspectRatio = 1, ...inputStyle } = StyleSheet.flatten(props.style) || {};
  const style = [inputStyle, { aspectRatio }];

  if (layout) {
    const { width = 0, height = 0 } = layout;
    if (width === 0) {
      style.push({ width: height * aspectRatio, height });
    } else {
      style.push({ width, height: width * aspectRatio });
    }
  }

  return (
    <View {...props} style={style} onLayout={({ nativeEvent: { layout } }) => setLayout(layout)} />
  );
}

export default function App() {
  return (
    <LinearGradient colors={['orange', 'blue']} style={styles.container}>
      <AspectView style={{ aspectRatio: 1, backgroundColor: 'green', width: 40 }} />
      <Text testID="basic-text">Open up App.js to start working on your app!</Text>
      <Text testID="expo-constants-manifest">{JSON.stringify(Constants.manifest)}</Text>
      {boolish('CI', false) && <Text testID="has-ci-text">Has CI env</Text>}
      {global.ResizeObserver && (
        <Text testID="has-resize-observer">Has ResizeObserver polyfill</Text>
      )}
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
