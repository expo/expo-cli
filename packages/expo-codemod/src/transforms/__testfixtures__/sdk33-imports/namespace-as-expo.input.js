/* eslint-disable import/namespace */
/* eslint-disable import/order */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Expo from 'expo';

Expo.Updates.addListener(() => {});

const documentDirectory = Expo.FileSystem.documentDirectory,
  cacheDirectory = Expo.FileSystem.cacheDirectory;
const manifest = Expo.Constants.manifest;

export { documentDirectory, cacheDirectory, manifest };

export function pickDocumentAsync(options) {
  return Expo.DocumentPicker.getDocumentAsync(options);
}

export default () => (
  <ScrollView>
    <View style={styles.view}>
      <Expo.BlurView tint="light" intensity={50} style={StyleSheet.absoluteFill}>
        <Text>Blur</Text>
      </Expo.BlurView>
    </View>
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
