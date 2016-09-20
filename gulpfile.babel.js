/**
 * @license
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import runSequence from 'run-sequence';
import webpack from 'webpack-stream';

const $ = gulpLoadPlugins();

gulp.task('lint', () => {
  return gulp.src([
    '*.js',
    'static/js/**/*.js',
  ])
    .pipe(gulp.dest('dist'))
    .pipe($.eslint({fix: true}))
    .pipe($.eslint.format())
    .pipe($.eslint.failAfterError());
});

var names = ['main', 'analyze'];

names.map(
  name =>
    gulp.task(
      name,
      () =>
        gulp.src(`./static/js/${name}.js`)
        .pipe(webpack({
          devtool: 'inline-source-map',
          output: {
            filename: `${name}.bundle.js`,
          },
          module: {
            loaders: [
              {
                test: /\.es6\.js$/,
                loader: 'babel',
                query: {
                  presets: ['es2015'],
                  plugins: ['transform-runtime']
                },
              },
            ],
          },
        }))
        .pipe(gulp.dest('./static/bundle'))
    )
);

gulp.task('build', gulp.parallel(names));

gulp.task('default', done =>
  runSequence(
    'lint',
    done
  )
);
