/* global alert */
import { Camera } from 'expo-camera';
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import * as Font from 'expo-font';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as MailComposer from 'expo-mail-composer';
import * as Permissions from 'expo-permissions';
import * as Print from 'expo-print';
import * as SMS from 'expo-sms';
import React, { useEffect, useState } from 'react';
import { Button, ScrollView, Text, View } from 'react-native';

import Accelerometer from '../components/Accelerometer';
import Battery from '../components/Battery';
import BlurView from '../components/Blur';
import ChatHeads from '../components/ChatHeads';
import Example from '../components/example';
import Layout from '../components/layout';
import * as SVGExamples from '../components/SVGExamples';
import Video from '../components/Video';

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
    <Example title="Font" style={{ justifyContent: 'space-around' }}>
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
    <Example title="Image Picker" style={{ justifyContent: 'space-around' }}>
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

function LocationExample() {
  const [item, setItem] = useState(null);

  return (
    <Example title="Location" style={{ justifyContent: 'space-around' }}>
      <Button
        title="Get Location"
        onPress={async () => {
          try {
            setItem(await Location.getCurrentPositionAsync());
          } catch ({ message }) {
            alert('Something went wrong: ' + message);
          }
        }}
      />
      {item && <JSONView json={item} />}
    </Example>
  );
}

function PermissionsExample() {
  const permissions = [
    ['CAMERA', Permissions.CAMERA],
    ['AUDIO_RECORDING', Permissions.AUDIO_RECORDING],
    ['LOCATION', Permissions.LOCATION],
    ['USER_FACING_NOTIFICATIONS', Permissions.USER_FACING_NOTIFICATIONS],
    ['NOTIFICATIONS', Permissions.NOTIFICATIONS],
    ['CONTACTS', Permissions.CONTACTS],
    ['SYSTEM_BRIGHTNESS', Permissions.SYSTEM_BRIGHTNESS],
    ['CAMERA_ROLL', Permissions.CAMERA_ROLL],
    ['CALENDAR', Permissions.CALENDAR],
    ['REMINDERS', Permissions.REMINDERS],
  ];

  return (
    <Example title="Permissions">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'stretch', flex: 1 }}>
        {permissions.map(([permissionName, permissionType]) => (
          <View style={{ marginBottom: 12 }}>
            <Text style={{ marginBottom: 8 }}>{permissionName}</Text>
            <View style={{ flexDirection: 'row', flex: 1, justifyContent: 'space-around' }}>
              <Button
                style={{ marginVertical: 4 }}
                key={permissionType}
                onPress={async () => {
                  alert((await Permissions.getAsync(permissionType)).status);
                }}
                title={`Get Status`}
              />
              <Button
                style={{ marginVertical: 4 }}
                key={permissionType}
                onPress={async () => {
                  alert((await Permissions.askAsync(permissionType)).status);
                }}
                title={`Request`}
              />
            </View>
          </View>
        ))}
      </ScrollView>
    </Example>
  );
}

function PrintExample() {
  return (
    <Example title="Print" style={{ justifyContent: 'space-around' }}>
      <Button
        title="Print something"
        onPress={async () => {
          try {
            await Print.printAsync({
              html: 'Dear Friend! <b>Happy</b> Birthday, enjoy your day! 🎈',
            });
          } catch ({ message }) {
            alert('Something went wrong: ' + message);
          }
        }}
      />
    </Example>
  );
}
function DocumentPickerExample() {
  const [item, setItem] = useState(null);

  return (
    <Example title="Document Picker" style={{ justifyContent: 'space-around' }}>
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
    <Example title="Mail Composer" style={{ justifyContent: 'space-around' }}>
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
    <Example title="SMS" style={{ justifyContent: 'space-around' }}>
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

function SensorsExample() {
  return (
    <Example title="Sensors" row>
      <Accelerometer />
    </Example>
  );
}

function SVGExample() {
  return (
    <Example title="SVG" row>
      {Object.keys(SVGExamples).map(key => {
        const SVGExample = SVGExamples[key];
        return (
          <React.Fragment key={key}>
            <Text style={{ paddingVertical: 8 }}>{key}</Text>
            <SVGExample />
          </React.Fragment>
        );
      })}
    </Example>
  );
}
function BatteryExample() {
  return (
    <Example title="Battery">
      <Battery />
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
      <ScrollView style={{ flex: 1 }}>
        <BlurView />
      </ScrollView>
    </Example>
  );
}

function VideoExample() {
  return (
    <Example title="Video">
      <Video />
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

function GesturesExample() {
  return (
    <Example title="Gestures">
      <ChatHeads />
    </Example>
  );
}

export default () => (
  <Layout title="Expo Gatsby Examples">
    <VideoExample />
    <CameraExample />
    <GesturesExample />
    <BlurViewExample />
    <SVGExample />
    <LinearGradientExample />
    <PermissionsExample />
    <LocationExample />
    <SensorsExample />
    <BatteryExample />
    <PrintExample />
    <MailComposerExample />
    <SMSExample />
    <ImagePickerExample />
    <DocumentPickerExample />
    <FontExample />
    <ConstantsExample />
  </Layout>
);
