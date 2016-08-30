var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');

var app = express();

app.use(bodyParser.urlencoded({ extended: false, limit: '500mb' }));

app.use(express.static('static'));

app.post('/save', function(req, res) {
  var baseName = req.body.label.replace(/[^A-Za-z0-9-]/g, '_');
  var data = req.body.data;

  if ( ! baseName || ! data ) {
    res.send('Missing data. Nothing saved.');
    return;
  }

  function tryWrite(baseName, i) {
    var path = './data/' + baseName + '_' + i + '.json';
    console.log('Trying to save as', path);
    fs.stat(path, function(err, stats) {
      if ( ! err || err.code !== 'ENOENT' ) {
        tryWrite(baseName, i + 1);
        return;
      }
      console.log('Saving as', path);
      fs.writeFileSync(path, data);
      res.send('Wrote ' + data.length + ' characters as ' + path);
    });
  }

  tryWrite(baseName, 0);
});

app.listen(8000, function () {
  console.log('Listening...');
});
