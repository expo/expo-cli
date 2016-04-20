import 'instapromise';

import gulp from 'gulp';
import shell from 'gulp-shell';

import buildTasks from './gulp/build-tasks';
import releaseTasks from './gulp/release-tasks';

let tasks = {
  ...buildTasks,
  ...releaseTasks,
};

gulp.task('build', tasks.babel);
gulp.task('watch', gulp.series(tasks.babel, tasks.watchBabel));
gulp.task('clean', tasks.clean);

gulp.task('publish', gulp.series(
  gulp.parallel(
    gulp.series(tasks.clean, tasks.babel),
    tasks.archiveTemplate
  ),
  shell.task(['npm publish'])
));

gulp.task('default', gulp.series('watch'));
