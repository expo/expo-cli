const webpack = require('webpack');
const path = require('path');
const ls = require('list-directory-contents');
const fs = require('fs');
const assert = require('assert');
const chalk = require('chalk');

function run(name, next) {
  console.time(name);
  if (!name) {
    return console.log('End.');
  }
  require(path.resolve(`./tests/${name}/build/webpack.config.js`))().then(config => {
    console.log(`"${name}": building...`);
    webpack(config, (err, stats) => {
      if (err) throw err;
      console.log(`"${name}": testing...`);
      const testPath = path.join(__dirname, name, 'test');
      const testPathLength = testPath.length;
      // Get the file contents for the directory we want to match
      ls(testPath, (err, tree) => {
        if (err) throw err;

        const testTree = tree.filter(i => /.*\..+/.test(i));
        const testContent = testTree.map(i => i.substring(testPathLength));
        const testContentLength = testContent.length;
        const outputPath = path.join(__dirname, name, 'output');
        const outputPathLength = outputPath.length;

        // Get the file contents for the directory we just generated
        ls(outputPath, (err, outputTree) => {
          if (err) throw err;

          const outputContent = outputTree.filter(i => /.*\..+/.test(i));
          const outputContentLength = outputContent.length;
          if (testContentLength === outputContentLength) {
            const result = outputContent.reduce((previous, current) => {
              const p = current.substring(outputPathLength);
              const f = testContent.indexOf(p);
              return f > -1 && fs.readFileSync(current).equals(fs.readFileSync(testTree[f]))
                ? previous + 1
                : previous;
            }, 0);
            if (result === testContentLength) {
              console.log(chalk.bgGreen.black(`Test "${name}" passed.`));
              console.timeEnd(name);
              run(next.shift(), next);
            } else {
              console.log(chalk.bgRed.black('There are files missing or with different content.'));
              console.log(chalk.bgRed.black(`Test "${name}" failedon file ${outputContent}.`));
              console.timeEnd(name);
              assert(result === testContentLength);
            }
          } else {
            console.log(chalk.bgRed.black(`Expected ${testContentLength} file(s).`));
            console.log(chalk.bgRed.black(`Found ${outputContentLength} file(s).`));
            console.log(chalk.bgRed.black(`Test "${name}" failed.`));
            console.timeEnd(name);
            assert(testContentLength === outputContentLength);
          }
        });
      });
    });
  });
}

module.exports = run;
