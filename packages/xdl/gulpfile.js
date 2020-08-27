const gulp = require('gulp');

const buildTasks = require('./gulp/build-tasks');

const tasks = Object.assign({}, buildTasks);

gulp.task('build', tasks.babel);
gulp.task('watch', gulp.series(tasks.babel, tasks.watchBabel));
gulp.task('caches', tasks.caches);
gulp.task('default', gulp.series('watch'));
