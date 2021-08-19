# Test plan

## Starting Expo Developer Tools

- Start Expo CLI with `expo start`:
  - ✅ (1st time use) Should show a prompt asking if you want to always open devtools in the browser.
  - ✅ (after 1st time) Should automatically open devtools in the browser.
- ✅ Should show "Metro Bundler" as a source in the sidebar and open its logs by default.
- ✅ Should update the URL field when you select a connection (host type): Tunnel/LAN/localhost

## Opening the project

- Open your project on iOS simulator / open on Android emulator or USB connected Android device
  - ✅ Should show a toast that says simulator is opening.
  - ✅ Should replace the toast with success toast when finished.
  - ✅ Should replace the toast with an error toast, if opening failed.
- Open on a device by sending email
  - ✅ Should validate that the recipient (email address) is not empty.
  - ✅ Should show a toast and disable send button when sending.
  - ✅ Should replace the toast with a success toast when sent.
  - ✅ Should show an error if sending failed (e.g. machine not connected to internet).
  - ✅ Should send the URL with the type chosen in "selected connection".
  - ✅ Should use the last recipient as a default value for the field (after you refresh the page).
- Open on device using the QR code.

## Logs

- ✅ Should show device logs when the app has started on a device.
- ✅ Should show show the number of log records in the left sidebar
- ✅ Should have different styles for warning and error logs.
- ✅ Clicking a log source in the sidebar should replace the selected (if any) or the first log panel with its logs.
- ✅ Dragging a log source from the sidebar to a log panel should work.
- ✅ Dragging a log panel to another log panel should work.
- ✅ Selecting different numbers of log panels (upper right corner) should work.

## Issues

- Add an error to your app, e.g. incorrect react-native version or an invalid field in `app.json`.
- ✅ "Issues" log source should appear as the first item in the left sidebar.
- ✅ Should be able to open Issues in a log panel.
- ✅ "Issues" should disappear when there's no more errors.

## Publishing

- ✅ Editing app name should update the slug, if slug matches the name (e.g. "My App" and "my-app").
- ✅ Should validate app name and slug.
- ✅ Should show a toast after clicking "Publish"
- ✅ Should replace the toast when published successfully and display the expo.dev URL.
- ✅ Should handle failed publish (e.g. machine not connected to internet).
- ✅ Changes to fields should be persisted to `app.json` after publishing.
- ✅ Publishing should be disabled when running with `expo start --offline`.
