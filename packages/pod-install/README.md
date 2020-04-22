<!-- Title -->
<h1 align="center">
👋 Welcome to <br><code>pod-install</code>
</h1>

---

<!-- Body -->

## 🚀 Usage

```sh
npx pod-install
```

👋 **Notice:** This package is not limited to Expo projects, you can use it with any iOS or Xcode project using CocoaPods.

## 🤔 Why?

Run `npx pod-install` to ensure CocoaPods are installed on the device and the repo is up-to-date.

> The process will quit if the machine isn't darwin.

## ⚙️ Options

For more information run `npx pod-install --help` (or `-h`)

| Flag                | Input       | Description                                   | Default                |
| ------------------- | ----------- | --------------------------------------------- | ---------------------- |
| `--non-interactive` | `[boolean]` | Skip prompting to install CocoaPods with sudo | `process.stdout.isTTY` |

## License

The Expo source code is made available under the [MIT license](LICENSE). Some of the dependencies are licensed differently, with the BSD license, for example.
