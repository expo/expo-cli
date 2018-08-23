# osascript
Tools for running an osascripts in Node

```js
  ccheever@Charless-MacBook-Air:~/projects/osascript$nesh -y
  .Node v4.1.0
  Type .help for more information
  nesh*> .require .
  osascript = require("/Users/ccheever/projects/osascript")
  nesh*> yield osascript.execAsync('tell app "System Events" to count processes whose name is "Simulator"')
  '1\n'
  nesh*> yield osascript.spawnAsync('quit app "Safari"')
  0
  nesh*>
```
