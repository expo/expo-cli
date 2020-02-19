const path = require('path');
const fs = require('fs');
const request = require('request');

const paths = {
  caches: 'caches',
};

const tasks = {
  caches(done) {
    request('https://exp.host/--/versions', (error, result, body) => {
      if (error) {
        throw error;
      }

      // we don't need to do anything here, just let it throw if invalid json
      const response = JSON.parse(body);

      fs.writeFileSync(path.join(paths.caches, 'versions.json'), body, {
        encoding: 'utf8',
      });

      for (let version of Object.keys(response.sdkVersions)) {
        request(`https://exp.host/--/xdl-schema/${version}`, (error, result, body) => {
          if (error) {
            throw error;
          }

          JSON.parse(body);
          fs.writeFileSync(path.join(paths.caches, `schema-${version}.json`), body, {
            encoding: 'utf8',
          });
        });
      }

      done();
    });
  },
};

module.exports = tasks;
