import { BlurView } from 'expo-blur';
import { Camera } from 'expo-camera';
import Constants from 'expo-constants';
import * as Font from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text } from 'react-native';

import Example from '../components/example';
import Layout from '../components/layout';

const FontExample = () => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      await Font.loadAsync({
        'retro-regular': require('../assets/retro-regular.ttf'),
      });
      setLoaded(true);
    })();
  }, []);

  if (!loaded) {
    return (
      <Example title="Font">
        <Text>Loading...</Text>
      </Example>
    );
  }

  return (
    <Example title="Font">
      <Text
        style={{
          fontFamily: 'retro-regular',
          backgroundColor: 'transparent',
          fontSize: 56,
          color: '#000',
        }}>
        Cool new font
      </Text>
    </Example>
  );
};

const ConstantsExample = () => {
  return (
    <Example title="Constants">
      <Text
        style={{
          backgroundColor: 'transparent',
          fontSize: 15,
          color: '#000',
        }}>
        {JSON.stringify(Constants, null, 2)}
      </Text>
    </Example>
  );
};

const LinearGradientExample = () => {
  return (
    <Example title="LinearGradient">
      <LinearGradient
        colors={['red', 'blue']}
        style={[{ padding: 15, alignItems: 'center', borderRadius: 5 }]}>
        <Text
          style={{
            backgroundColor: 'transparent',
            fontSize: 15,
            color: '#fff',
          }}>
          Gradient
        </Text>
      </LinearGradient>
    </Example>
  );
};

const BlurViewExample = () => {
  return (
    <Example title="BlurView">
      <Image
        source={{ uri: 'https://i.ytimg.com/vi/y588qNiCZZo/maxresdefault.jpg' }}
        style={{ flex: 1, height: 300 }}
      />
      <BlurView
        style={[StyleSheet.absoluteFill, { padding: 15, alignItems: 'center', borderRadius: 5 }]}>
        <Text
          style={{
            backgroundColor: 'transparent',
            fontSize: 15,
            color: '#fff',
          }}>
          Blur View
        </Text>
      </BlurView>
    </Example>
  );
};

const CameraExample = () => {
  return (
    <Example title="Camera">
      <Camera style={[{ alignItems: 'center', borderRadius: 5, minHeight: 300 }]} />
    </Example>
  );
};

const Elements = () => (
  <Layout title="Expo Examples">
    <FontExample />
    <LinearGradientExample />
    <BlurViewExample />
    <ConstantsExample />
    {false && <CameraExample />}
  </Layout>
);

export default Elements;
