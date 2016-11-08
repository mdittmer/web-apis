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
import webpackStream from 'webpack-stream';
import webpack from 'webpack';
import yargs from 'yargs';

const argv = yargs
    .describe('production', 'Build for production')
    .argv;

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

const names = ['main', 'analyze_og', 'analyze_idl.es6'];

let webpackConfig = {
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
  plugins: [],
};
if (argv.production) {
  webpackConfig.plugins.push(new webpack.optimize.UglifyJsPlugin());
} else {
  webpackConfig.devtool = 'inline-source-map';
}

names.map(
  name =>
    gulp.task(
      name,
      () => gulp.src(`./static/js/${name}.js`)
        .pipe(webpackStream(Object.assign({
          output: {
            filename: `${name}.bundle.js`,
          },
        }, webpackConfig)))
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
