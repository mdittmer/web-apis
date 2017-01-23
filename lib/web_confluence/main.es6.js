
var readGraph = require('./read_graph.es6.js');

file = `${__dirname}/../../data/og/window_Chrome_55.0.2883.75_Windows_10.0.json`; // #DEBUG
//file = `${__dirname}/../../data/og/window_Chrome_55.0.2883.75_OSX_10.11.6.json`; // #DEBUG

g = readGraph(file);
console.log(g);
