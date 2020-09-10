import axios from 'axios';
import fs from 'fs-extra';
import { compile } from 'json-schema-to-typescript';
import path from 'path';
import semver from 'semver';

let version = process.argv[2];

if (!version) {
  const packageJSON = require('../package.json');
  // @ts-ignore
  version = semver.parse(packageJSON.version).major;
  console.log('Using package version: ' + version);
}
if (version !== 'unversioned') {
  version += '.0.0';
} else {
  version = version.toUpperCase();
}

(async () => {
  const { data } = await axios.get(
    `http://exp.host/--/api/v2/project/configuration/schema/${version}`
  );
  const ts = await compile(data.data.schema, 'ExpoConfig');
  const filepath = `src/index.ts`;
  fs.ensureDirSync(path.dirname(filepath));
  await fs.writeFile(filepath, ts, 'utf8');
})();
