import Constants from 'expo-constants';
import { boolish } from 'getenv';
import React from 'react';
import { Text, View } from 'react-native';

// Used to test resize-observer
function AspectView(props) {
  const [layout, setLayout] = React.useState(null);

  const { aspectRatio = 1, ...inputStyle } = props.style;
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

// These assets will be used to ensure that the file-loader and url-loader are loading the assets properly.
const fontAsset = require('./font.ttf');
const imageAsset = require('./img.png');
// This tests that the wildcard (.*) loader is working properly.
const randomAsset = require('./random.bacon');

export default function App() {
  // Test that the SW is registered
  const [isSWRegistered, setSW] = React.useState(null);
  React.useEffect(() => {
    global.navigator.serviceWorker.ready.then(v => {
      console.log('ready', v.active.scriptURL);
      setSW(v.active.scriptURL.includes('expo-service-worker'));
    });
  }, []);

  return (
    <View
      colors={['orange', 'blue']}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <AspectView style={{ aspectRatio: 1, backgroundColor: 'green', width: 40 }} />
      <Text testID="basic-text">Open up App.js to start working on your app!</Text>
      <Text testID="expo-constants-manifest">{JSON.stringify(Constants.expoConfig)}</Text>
      <Text testID="asset-raw-image">{imageAsset}</Text>
      <Text testID="asset-raw-font">{fontAsset}</Text>
      <Text testID="asset-raw-wildcard">{typeof randomAsset}</Text>
      {boolish('CI', false) && <Text testID="has-ci-text">Has CI env</Text>}
      {isSWRegistered != null && <Text testID="has-sw-text">Has SW installed</Text>}
      {global.ResizeObserver && (
        <Text testID="has-resize-observer">Has ResizeObserver polyfill</Text>
      )}
    </View>
  );
}
