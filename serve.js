var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');

var app = express();

app.use(bodyParser.urlencoded({ extended: false, limit: '500mb' }));

app.use(express.static('static'));

var SAVE_HEAD = '<html><head><meta name="viewport" content="width=500, initial-scale=1"></head><body>';
var SAVE_FOOT = '</body></html>';

app.post('/save', function(req, res) {
  var baseName = req.body.label.replace(/[^A-Za-z0-9-]/g, '_');
  var data = req.body.data;

  if ( ! baseName || ! data ) {
    res.send('Missing data. Nothing saved.');
    return;
  }

  function tryWrite(baseName, i) {
    var path = './static/data/' + baseName + '_' + i + '.json';
    console.log('Trying to save as', path);
    fs.stat(path, function(err, stats) {
      if ( ! err || err.code !== 'ENOENT' ) {
        tryWrite(baseName, i + 1);
        return;
      }
      var latestPath = './static/data/' + baseName + '_latest.json';
      console.log('Renaming', latestPath, 'to', path);
      fs.rename(latestPath, path, function(err) {
        console.log('Saving', latestPath);
        fs.writeFileSync(latestPath, data);
        if ( err ) console.warn('Error renaming latest', err);
        res.send(SAVE_HEAD + 'Wrote ' + data.length + ' characters as ' +
                 latestPath + SAVE_FOOT);
      });
    });
  }

  tryWrite(baseName, 0);
});

app.listen(8000, function () {
  console.log('Listening...');
});
