// @ts-ignore
import { defineInlineTest, defineTest } from 'jscodeshift/dist/testUtils';

import transform from '../sdk33-imports';

// Bigger example located in __testfixtures__
defineTest(__dirname, 'sdk33-imports', {}, 'sdk33-imports/namespace-as-expo');

// Unchanged code
defineInlineTest(
  transform,
  {},
  `
  import { apisAreAvailable, Logs } from 'expo';
  import * as Expo from 'expo';
  `,
  `
  import { apisAreAvailable, Logs } from 'expo';
  import * as Expo from 'expo';
  `,
  'no changes'
);

// Non-trivial cases
defineInlineTest(
  transform,
  {},
  `
  import { Accelerometer, MapView } from 'expo';
  import { Marker, Overlay } from 'react-native-maps'
  import * as Sensors from 'expo-sensors';
  import { Barometer, Gyroscope } from 'expo-sensors';
  `,
  `
  import MapView, { Marker, Overlay } from 'react-native-maps';
  import * as Sensors from 'expo-sensors';
  import { Accelerometer, Barometer, Gyroscope } from 'expo-sensors';
  `,
  'merging with existing imports'
);
defineInlineTest(
  transform,
  {},
  `
  import { BlurView, Updates } from 'expo';
  `,
  `
  import { Updates } from 'expo';
  import { BlurView } from 'expo-blur';
`,
  'expo import should remain'
);
defineInlineTest(
  transform,
  {},
  `
  // @flow
  import { Camera } from 'expo';
  `,
  `
  // @flow
  import { Camera } from 'expo-camera';
`,
  'retain comment on first line'
);

// All deprecated modules
defineInlineTest(
  transform,
  {},
  `import { AdMobBanner } from 'expo';`,
  `import { AdMobBanner } from 'expo-ads-admob';`,
  'expo-ads-admob'
);
defineInlineTest(
  transform,
  {},
  `import { AdMobInterstitial } from 'expo';`,
  `import { AdMobInterstitial } from 'expo-ads-admob';`,
  'expo-ads-admob'
);
defineInlineTest(
  transform,
  {},
  `import { AdMobRewarded } from 'expo';`,
  `import { AdMobRewarded } from 'expo-ads-admob';`,
  'expo-ads-admob'
);
defineInlineTest(
  transform,
  {},
  `import { PublisherBanner } from 'expo';`,
  `import { PublisherBanner } from 'expo-ads-admob';`,
  'expo-ads-admob'
);
defineInlineTest(
  transform,
  {},
  `import { FacebookAds } from 'expo';`,
  `import * as FacebookAds from 'expo-ads-facebook';`,
  'expo-ads-facebook'
);
defineInlineTest(
  transform,
  {},
  `import { Amplitude } from 'expo';`,
  `import * as Amplitude from 'expo-analytics-amplitude';`,
  'expo-analytics-amplitude'
);
defineInlineTest(
  transform,
  {},
  `import { Segment } from 'expo';`,
  `import * as Segment from 'expo-analytics-segment';`,
  'expo-analytics-segment'
);
defineInlineTest(
  transform,
  {},
  `import { AppAuth } from 'expo';`,
  `import * as AppAuth from 'expo-app-auth';`,
  'expo-app-auth'
);
defineInlineTest(
  transform,
  {},
  `import { Asset } from 'expo';`,
  `import { Asset } from 'expo-asset';`,
  'expo-asset'
);
defineInlineTest(
  transform,
  {},
  `import { Audio } from 'expo';`,
  `import { Audio } from 'expo-av';`,
  'expo-av'
);
defineInlineTest(
  transform,
  {},
  `import { Video } from 'expo';`,
  `import { Video } from 'expo-av';`,
  'expo-av'
);
defineInlineTest(
  transform,
  {},
  `import { BackgroundFetch } from 'expo';`,
  `import * as BackgroundFetch from 'expo-background-fetch';`,
  'expo-background-fetch'
);
defineInlineTest(
  transform,
  {},
  `import { BarCodeScanner } from 'expo';`,
  `import { BarCodeScanner } from 'expo-barcode-scanner';`,
  'expo-barcode-scanner'
);
defineInlineTest(
  transform,
  {},
  `import { BlurView } from 'expo';`,
  `import { BlurView } from 'expo-blur';`,
  'expo-blur'
);
defineInlineTest(
  transform,
  {},
  `import { Brightness } from 'expo';`,
  `import * as Brightness from 'expo-brightness';`,
  'expo-brightness'
);
defineInlineTest(
  transform,
  {},
  `import { Calendar } from 'expo';`,
  `import * as Calendar from 'expo-calendar';`,
  'expo-calendar'
);
defineInlineTest(
  transform,
  {},
  `import { Camera } from 'expo';`,
  `import { Camera } from 'expo-camera';`,
  'expo-camera'
);
defineInlineTest(
  transform,
  {},
  `import { Constants } from 'expo';`,
  `import Constants from 'expo-constants';`,
  'expo-constants'
);
defineInlineTest(
  transform,
  {},
  `import { Contacts } from 'expo';`,
  `import * as Contacts from 'expo-contacts';`,
  'expo-contacts'
);
defineInlineTest(
  transform,
  {},
  `import { Crypto } from 'expo';`,
  `import * as Crypto from 'expo-crypto';`,
  'expo-crypto'
);
defineInlineTest(
  transform,
  {},
  `import { DocumentPicker } from 'expo';`,
  `import * as DocumentPicker from 'expo-document-picker';`,
  'expo-document-picker'
);
defineInlineTest(
  transform,
  {},
  `import { FaceDetector } from 'expo';`,
  `import * as FaceDetector from 'expo-face-detector';`,
  'expo-face-detector'
);
defineInlineTest(
  transform,
  {},
  `import { Facebook } from 'expo';`,
  `import * as Facebook from 'expo-facebook';`,
  'expo-facebook'
);
defineInlineTest(
  transform,
  {},
  `import { FileSystem } from 'expo';`,
  `import * as FileSystem from 'expo-file-system';`,
  'expo-file-system'
);
defineInlineTest(
  transform,
  {},
  `import { Font } from 'expo';`,
  `import * as Font from 'expo-font';`,
  'expo-font'
);
defineInlineTest(
  transform,
  {},
  `import { GL } from 'expo';`,
  `import * as GL from 'expo-gl';`,
  'expo-gl'
);
defineInlineTest(
  transform,
  {},
  `import { GLView } from 'expo';`,
  `import { GLView } from 'expo-gl';`,
  'expo-gl'
);
defineInlineTest(
  transform,
  {},
  `import { GoogleSignIn } from 'expo';`,
  `import * as GoogleSignIn from 'expo-google-sign-in';`,
  'expo-google-sign-in'
);
defineInlineTest(
  transform,
  {},
  `import { Haptic } from 'expo';`,
  `import * as Haptic from 'expo-haptics';`,
  'expo-haptics'
);
defineInlineTest(
  transform,
  {},
  `import { Haptics } from 'expo';`,
  `import * as Haptics from 'expo-haptics';`,
  'expo-haptics'
);
defineInlineTest(
  transform,
  {},
  `import { ImageManipulator } from 'expo';`,
  `import * as ImageManipulator from 'expo-image-manipulator';`,
  'expo-image-manipulator'
);
defineInlineTest(
  transform,
  {},
  `import { ImagePicker } from 'expo';`,
  `import * as ImagePicker from 'expo-image-picker';`,
  'expo-image-picker'
);
defineInlineTest(
  transform,
  {},
  `import { IntentLauncher } from 'expo';`,
  `import * as IntentLauncher from 'expo-intent-launcher';`,
  'expo-intent-launcher'
);
defineInlineTest(
  transform,
  {},
  `import { IntentLauncherAndroid } from 'expo';`,
  `import * as IntentLauncherAndroid from 'expo-intent-launcher';`,
  'expo-intent-launcher'
);
defineInlineTest(
  transform,
  {},
  `import { KeepAwake } from 'expo';`,
  `import KeepAwake from 'expo-keep-awake';`,
  'expo-keep-awake'
);
defineInlineTest(
  transform,
  {},
  `import { LinearGradient } from 'expo';`,
  `import { LinearGradient } from 'expo-linear-gradient';`,
  'expo-linear-gradient'
);
defineInlineTest(
  transform,
  {},
  `import { LocalAuthentication } from 'expo';`,
  `import * as LocalAuthentication from 'expo-local-authentication';`,
  'expo-local-authentication'
);
defineInlineTest(
  transform,
  {},
  `import { Localization } from 'expo';`,
  `import * as Localization from 'expo-localization';`,
  'expo-localization'
);
defineInlineTest(
  transform,
  {},
  `import { Location } from 'expo';`,
  `import * as Location from 'expo-location';`,
  'expo-location'
);
defineInlineTest(
  transform,
  {},
  `import { MailComposer } from 'expo';`,
  `import * as MailComposer from 'expo-mail-composer';`,
  'expo-mail-composer'
);
defineInlineTest(
  transform,
  {},
  `import { MediaLibrary } from 'expo';`,
  `import * as MediaLibrary from 'expo-media-library';`,
  'expo-media-library'
);
defineInlineTest(
  transform,
  {},
  `import { Permissions } from 'expo';`,
  `import * as Permissions from 'expo-permissions';`,
  'expo-permissions'
);
defineInlineTest(
  transform,
  {},
  `import { Print } from 'expo';`,
  `import * as Print from 'expo-print';`,
  'expo-print'
);
defineInlineTest(
  transform,
  {},
  `import { Random } from 'expo';`,
  `import * as Random from 'expo-random';`,
  'expo-random'
);
defineInlineTest(
  transform,
  {},
  `import { SecureStore } from 'expo';`,
  `import * as SecureStore from 'expo-secure-store';`,
  'expo-secure-store'
);
defineInlineTest(
  transform,
  {},
  `import { Accelerometer } from 'expo';`,
  `import { Accelerometer } from 'expo-sensors';`,
  'expo-sensors'
);
defineInlineTest(
  transform,
  {},
  `import { Barometer } from 'expo';`,
  `import { Barometer } from 'expo-sensors';`,
  'expo-sensors'
);
defineInlineTest(
  transform,
  {},
  `import { Gyroscope } from 'expo';`,
  `import { Gyroscope } from 'expo-sensors';`,
  'expo-sensors'
);
defineInlineTest(
  transform,
  {},
  `import { Magnetometer } from 'expo';`,
  `import { Magnetometer } from 'expo-sensors';`,
  'expo-sensors'
);
defineInlineTest(
  transform,
  {},
  `import { MagnetometerUncalibrated } from 'expo';`,
  `import { MagnetometerUncalibrated } from 'expo-sensors';`,
  'expo-sensors'
);
defineInlineTest(
  transform,
  {},
  `import { Sensors } from 'expo';`,
  `import * as Sensors from 'expo-sensors';`,
  'expo-sensors'
);
defineInlineTest(
  transform,
  {},
  `import { Sharing } from 'expo';`,
  `import * as Sharing from 'expo-sharing';`,
  'expo-sharing'
);
defineInlineTest(
  transform,
  {},
  `import { SMS } from 'expo';`,
  `import * as SMS from 'expo-sms';`,
  'expo-sms'
);
defineInlineTest(
  transform,
  {},
  `import { Speech } from 'expo';`,
  `import * as Speech from 'expo-speech';`,
  'expo-speech'
);
defineInlineTest(
  transform,
  {},
  `import { SQLite } from 'expo';`,
  `import { SQLite } from 'expo-sqlite';`,
  'expo-sqlite'
);
defineInlineTest(
  transform,
  {},
  `import { TaskManager } from 'expo';`,
  `import * as TaskManager from 'expo-task-manager';`,
  'expo-task-manager'
);
defineInlineTest(
  transform,
  {},
  `import { WebBrowser } from 'expo';`,
  `import * as WebBrowser from 'expo-web-browser';`,
  'expo-web-browser'
);
defineInlineTest(
  transform,
  {},
  `import { GestureHandler } from 'expo';`,
  `import * as GestureHandler from 'react-native-gesture-handler';`,
  'react-native-gesture-handler'
);
defineInlineTest(
  transform,
  {},
  `import { Icon } from 'expo';`,
  `import * as Icon from '@expo/vector-icons';`,
  '@expo/vector-icons'
);
defineInlineTest(
  transform,
  {},
  `import { MapView } from 'expo';`,
  `import MapView from 'react-native-maps';`,
  'react-native-maps'
);
defineInlineTest(
  transform,
  {},
  `import { Svg } from 'expo';`,
  `import * as Svg from 'react-native-svg';`,
  'react-native-svg'
);
defineInlineTest(
  transform,
  {},
  `import { WebView } from 'expo';`,
  `import { WebView } from 'react-native-webview';`,
  'react-native-webview'
);
