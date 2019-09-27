import { BlurView } from 'expo-blur';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as SMS from 'expo-sms';
import * as MailComposer from 'expo-mail-composer';

import Constants from 'expo-constants';
import * as Font from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Image, Button, ScrollView, StyleSheet, Text } from 'react-native';

import Example from '../components/example';
import Layout from '../components/layout';

function FontExample() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      await Font.loadAsync({
        'retro-regular': require('../assets/retro-regular.ttf'),
      });
      setLoaded(true);
    })();
  }, []);
  return (
    <Example title="Font">
      {loaded && (
        <Text
          style={{
            fontFamily: 'retro-regular',
            backgroundColor: 'transparent',
            fontSize: 56,
            color: '#000',
          }}>
          Cool new font
        </Text>
      )}
    </Example>
  );
}

function ImagePickerExample() {
  const [item, setItem] = useState(null);

  return (
    <Example title="Image Picker">
      <Button
        title="Open Camera"
        onPress={async () => {
          const { cancelled, ...doc } = await ImagePicker.launchCameraAsync();
          if (!cancelled) {
            setItem(doc);
          } else {
            setItem(null);
          }
        }}
      />
      <Button
        title="Photo Library"
        onPress={async () => {
          const { cancelled, ...doc } = await ImagePicker.launchImageLibraryAsync();
          if (!cancelled) {
            setItem(doc);
          } else {
            setItem(null);
          }
        }}
      />

      {item && <JSONView json={item} />}
    </Example>
  );
}

function DocumentPickerExample() {
  const [item, setItem] = useState(null);

  return (
    <Example title="Document Picker">
      <Button
        title="Pick item"
        onPress={async () => {
          const { type, ...doc } = await DocumentPicker.getDocumentAsync();
          if (type === 'success') {
            setItem(doc);
          } else {
            setItem(null);
          }
        }}
      />

      {item && <JSONView json={item} />}
    </Example>
  );
}

function MailComposerExample() {
  const [status, setStatus] = useState(null);

  return (
    <Example title="Mail Composer">
      <Button
        title="Compose Email"
        onPress={async () => {
          const { status } = await MailComposer.composeAsync({
            recipients: ['jobs@expo.io'],
            ccRecipients: ['example@gatsby.expo'],
            bccRecipients: ['example@expo.gatsby'],
            subject: 'API test message',
            body: 'Test sending mail from gatsby with expo-mail-composer',
          });
          setStatus(status);
        }}
      />
      {status && <Text style={{ paddingVertical: 8 }}>Status: {status}</Text>}
    </Example>
  );
}
function SMSExample() {
  const [status, setStatus] = useState(null);
  const [isAvailable, setAvailable] = useState(null);

  useEffect(() => {
    (async () => {
      setAvailable(await SMS.isAvailableAsync());
    })();
  }, []);

  return (
    <Example title="SMS">
      {status && <Text> Status: {status}</Text>}

      {isAvailable == null && <Text>Checking capability for this device...</Text>}
      {isAvailable === false && <Text>Sending SMS is not available on this device</Text>}
      {isAvailable && (
        <Button
          title="Send Text Message"
          onPress={async () => {
            const status = await SMS.sendSMSAsync(['8675309'], 'I love Expo + Gatsby');
            setStatus(status);
          }}
        />
      )}
    </Example>
  );
}

function JSONView({ json }) {
  return (
    <ScrollView style={{ flex: 1, overflow: 'scroll' }}>
      <Text
        style={{
          backgroundColor: 'transparent',
          fontSize: 15,
          color: '#000',
        }}>
        {JSON.stringify(json, null, 2)}
      </Text>
    </ScrollView>
  );
}

function ConstantsExample() {
  return (
    <Example title="Constants">
      <JSONView json={Constants} />
    </Example>
  );
}

function LinearGradientExample() {
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
}

function BlurViewExample() {
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
}

function CameraExample() {
  return (
    <Example title="Camera">
      <Camera style={[{ alignItems: 'center', borderRadius: 5, minHeight: 300 }]} />
    </Example>
  );
}

export default () => (
  <Layout title="Expo Examples">
    <MailComposerExample />
    <SMSExample />
    <ImagePickerExample />
    <DocumentPickerExample />
    <FontExample />
    <CameraExample />
    <BlurViewExample />
    <LinearGradientExample />
    <ConstantsExample />
  </Layout>
);
