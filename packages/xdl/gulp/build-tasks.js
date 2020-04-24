const path = require('path');
const gulp = require('gulp');
const babel = require('gulp-babel');
const changed = require('gulp-changed');
const axios = require('axios');
const fse = require('fs-extra');
const plumber = require('gulp-plumber');
const sourcemaps = require('gulp-sourcemaps');
const rimraf = require('rimraf');

const packageJson = require('@expo/xdl/package.json');

const paths = {
  source: {
    js: 'src/**/*.js',
    ts: 'src/**/*.ts',
  },
  build: 'build',
  caches: 'caches',
};

const tsconfig = require('../tsconfig.json');
const excluded = tsconfig.exclude.map(exclude => '!' + exclude);
const sourcePaths = Object.values(paths.source).concat(excluded);

const tasks = {
  babel() {
    return gulp
      .src(sourcePaths)
      .pipe(changed(paths.build))
      .pipe(plumber())
      .pipe(
        sourcemaps.init({
          identityMap: true,
        })
      )
      .pipe(babel())
      .pipe(
        sourcemaps.write('__sourcemaps__', {
          sourceRoot: `/${packageJson.name}@${packageJson.version}/src`,
        })
      )
      .pipe(gulp.dest(paths.build));
  },

  watchBabel(done) {
    gulp.watch(sourcePaths, tasks.babel);
    done();
  },

  clean(done) {
    rimraf(paths.build, done);
  },

  caches(done) {
    axios
      .get('https://exp.host/--/versions')
      .then(async ({ data }) => {
        fse.writeJsonSync(path.join(paths.caches, 'versions.json'), data);

        for (let version of Object.keys(data.sdkVersions)) {
          const {
            data: { data: schema },
          } = await axios.get(`https://exp.host/--/api/v2/project/configuration/schema/${version}`);

          fse.writeJsonSync(path.join(paths.caches, `schema-${version}.json`), schema);
        }
      })
      .catch(error => done(error))
      .then(() => done());
  },
};

module.exports = tasks;
