# install-expo-modules

`install-expo-modules` is a tool for existing react-native projects to adopt [expo-modules and SDK easier](https://docs.expo.dev/versions/latest/).

# Usage

Just to run `install-expo-modules` command in your project:

```
npx install-expo-modules
```

After that, you can add other expo-modules you need, e.g. `expo-device`:

```
expo install expo-device
# the expo command is from expo-cli. if you don't have this, run `npm -g install expo-cli` to install.
```

# What did `install-expo-modules` do for your project

- Install [`expo`](https://www.npmjs.com/package/expo) package for necessary core and react-native autolinking.
- Modify your project files to adopt expo-modules. If your project is managed by `git`, you can use `git diff` to review whatever `install-expo-modules` do for you.
- Since expo-modules' minimal requirements for iOS is 12.0, if your ios deployment target is lower than that, this tool will upgrade your deployment target to 12.0.
- `pod install` at last to update linked modules for iOS.
