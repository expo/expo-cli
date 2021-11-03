/* eslint-disable import/order */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Expo from 'expo';

// eslint-disable-next-line import/namespace
Expo.Updates.addListener(() => {});

// eslint-disable-next-line import/namespace
const documentDirectory = Expo.FileSystem.documentDirectory,
  // eslint-disable-next-line import/namespace
  cacheDirectory = Expo.FileSystem.cacheDirectory;
// eslint-disable-next-line import/namespace
const manifest = Expo.Constants.manifest;

export { documentDirectory, cacheDirectory, manifest };

export function pickDocumentAsync(options) {
  // eslint-disable-next-line import/namespace
  return Expo.DocumentPicker.getDocumentAsync(options);
}

export default () => (
  <ScrollView>
    <View style={styles.view}>
      {/* eslint-disable-next-line import/namespace */}
      <Expo.BlurView tint="light" intensity={50} style={StyleSheet.absoluteFill}>
        <Text>Blur</Text>
        {/* eslint-disable-next-line import/namespace */}
      </Expo.BlurView>
    </View>
    {/* eslint-disable-next-line import/namespace */}
    <Expo.MapView style={styles.mapView} initialRegion={initialRegion} />
  </ScrollView>
);

const styles = StyleSheet.create({
  view: { flex: 1 },
  mapView: {
    flex: 1,
  },
  image: { width: 96, height: 96 },
});

const initialRegion = {
  latitude: 37.78825,
  longitude: -122.4324,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};
