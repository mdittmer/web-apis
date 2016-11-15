let config = require('./webpack.dev.config.js');
config.module = config.module || {};
config.module.loaders = [{
  test: /\.js$/,
  loader: 'eslint',
  exclude: /(node_modules|bower_components|library)/,
}].concat(config.module.loaders || []);
module.exports = config;
