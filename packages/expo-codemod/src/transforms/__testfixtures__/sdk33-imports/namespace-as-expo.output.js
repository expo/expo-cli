/* eslint-disable import/namespace */
/* eslint-disable import/order */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Expo from 'expo';

import MapView from 'react-native-maps';
import { BlurView } from 'expo-blur';
import * as DocumentPicker from 'expo-document-picker';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';

Expo.Updates.addListener(() => {});

const documentDirectory = FileSystem.documentDirectory,
  cacheDirectory = FileSystem.cacheDirectory;
const manifest = Constants.manifest;

export { documentDirectory, cacheDirectory, manifest };

export function pickDocumentAsync(options) {
  return DocumentPicker.getDocumentAsync(options);
}

export default () => (
  <ScrollView>
    <View style={styles.view}>
      <BlurView tint="light" intensity={50} style={StyleSheet.absoluteFill}>
        <Text>Blur</Text>
      </BlurView>
    </View>
    <MapView style={styles.mapView} initialRegion={initialRegion} />
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
