const _ = require('lodash');
const webpack = require('webpack');

const entries = [
  {inDir: 'og', name: 'main'},
  {inDir: 'og', name: 'analyze_og'},
  {inDir: 'idl', name: 'analyze_idl.es6'}
];

const isExternal = (module) => {
  const userRequest = module.userRequest;

  if (typeof userRequest !== 'string') {
    return false;
  }

  return userRequest.indexOf('bower_components') >= 0 ||
    userRequest.indexOf('node_modules') >= 0 ||
    userRequest.indexOf('libraries') >= 0;
};

module.exports = {
  context: __dirname,
  entry: _.zipObject(
    entries.map(e => e.name),
    entries.map(e => `${__dirname}/../lib/${e.inDir}/${e.name}.js`)
  ),
  output: {
    path: `./static/bundle`,
    filename: '[name].bundle.js',
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
  plugins: [
    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendors',
      minChunks: function(module) {
        return isExternal(module);
      }
    }),
  ],
};
