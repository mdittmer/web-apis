const webpack = require('webpack');

let config = require('./webpack.config.es6.js');
config.plugins = config.plugins || [];
config.plugins.push(new webpack.optimize.UglifyJsPlugin());
module.exports = config;
