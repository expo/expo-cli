import { remote } from 'electron';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import * as Menu from './react-menu';
import { Balloon, Tray } from './react-tray';

function AppWindowMenu({ fileItems = [], editItems = [], menuItems = [] }) {
  return (
    <Menu.WindowMenu>
      {/* Menu file (app menu on Mac): includes window controls */}
      <Menu.DefaultFileMenu appName={Constants.manifest.name}>{fileItems}</Menu.DefaultFileMenu>

      {/* Menu edit: includes undo, redo, cut, copy, paste, select all */}
      <Menu.DefaultEditMenu>{editItems}</Menu.DefaultEditMenu>

      {/* Menu view: includes minimize, close, Bring All to Front */}
      <Menu.DefaultWindowMenu>{menuItems}</Menu.DefaultWindowMenu>
    </Menu.WindowMenu>
  );
}

function AppTray() {
  remote.app.dock.hide();

  return (
    <Tray
      onMouseMove={() => {
        remote.app.dock.setBadge('EXPO ' + Math.random());
      }}
      toolTip="Expo is rad"
      image={'./assets/tray-icon@2x.png'}>
      <Balloon title="Cool Balloon Title" content="Cool Balloon Content" />
      <Menu.MenuItem role="selectall" />
      <Menu.MenuItem label="Latest Backup: Yesterday" type="checkbox" />
      <Menu.MenuItem.Separator />
      <Menu.MenuItem label="Latest Backup: Yesterday" type="checkbox" enabled={false} />
    </Tray>
  );
}

export default function App() {
  return (
    <View style={{ flex: 1 }}>
      <AppTray />
      <div className="window-content">
        <Text
          testID="basic-text"
          onPress={() => {
            remote.app.dock.setBadge('EXPO');
          }}>
          Open up App.js to start working on your app!
        </Text>
      </div>
      <AppWindowMenu />

      <LinearGradient colors={['orange', 'blue']} style={styles.container}>
        <Text
          testID="basic-text"
          onPress={() => {
            remote.app.dock.setBadge('EXPO');
          }}>
          Open up App.js to start working on your app!
        </Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
