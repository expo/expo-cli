const axios = require('axios');
const { writeJsonSync } = require('fs-extra');
const path = require('path');

axios
  .get('https://exp.host/--/versions')
  .then(async ({ data }) => {
    writeJsonSync(path.join(__dirname, '../caches/versions.json'), data);

    for (const version of Object.keys(data.sdkVersions)) {
      if (data.sdkVersions[version].isDeprecated) {
        continue;
      }
      const {
        data: { data: schema },
      } = await axios.get(`https://exp.host/--/api/v2/project/configuration/schema/${version}`);

      const filePath = path.join(__dirname, `../caches/schema-${version}.json`);
      console.log('Writing', filePath);
      writeJsonSync(filePath, schema);
    }
  })
  .then(() => console.log('Caches updated.'))
  .catch(error => {
    console.error(error);
    console.error('Updating caches failed.');
    process.exit(1);
  });
