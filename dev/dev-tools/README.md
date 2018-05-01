# Expo Project Manager

Expo project manager supports

* viewing logs from supporting services, (React Native Packager)
* viewing logs from your device
* publishing your project
* debugging connectivity

## How to run locally?

### Begin the universe

Temporary: You need to bootstrap exp, and execute the bin while on ville's branch.
Use `pwd` to get the path to your project directory.

```sh
cd universe
bootstrap exp
./dev/exp/bin/exp.js start <YOUR_PROJECT_DIR>
```

In another terminal, you can run the following to see the UI.

```sh
npm install
npm install -g babel-node
npm run dev
```

To view the UI, visit `localhost:3333`

## How to cut a release and version?

TBA
