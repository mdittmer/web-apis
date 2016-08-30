(function() {
  function getData(/* urls */) {
    var len = arguments.length;
    var data = new Array(len);
    var count = 0;
    var ret;
    function store(i) {
      data[i] = ObjectVisitor.fromJSON(this.response);
      count++;
      if ( count === len ) ret && ret.apply(this, data);
    }
    for ( var i = 0; i < len; i++ ) {
      var url = arguments[i];
      var xhr = new XMLHttpRequest();
      xhr.responseType = 'json';
      xhr.addEventListener('load', store.bind(xhr, i));
      xhr.open('GET', url);
      xhr.send();
    }
    return function(f) {
      if ( count === len ) f && f.apply(this, data);
      else                 ret = f;
    };
  };

  function diffAPIs(ov1, ov2) {
    var arr = [];
    var fs = ov1.functions;
    for ( var i = 0; i < fs.length; i++ ) {
      var f = fs[i];
      var keys = ov1.getKeys(f);
      var key = keys[0];
      var bId;
      for ( var j = 0; j < keys.length; j++ ) {
        bId = ov2.lookup(keys[j]);
        if ( bId ) break;
      }
      if ( ! bId ) {
        arr.push(keys[0] || null);
      }
    }
    return arr;
  }

  function doAnalysis(ov1, ov2) {
    var aExtra = diffAPIs(ov1, ov2);
    var bExtra = diffAPIs(ov2, ov1);

    var str = 'Left\n  ' + aExtra.join('\n  ') + '\nRight\n  ' + bExtra.join('\n  ');
    document.querySelector('#pre').textContent = str;
  }

  function analyze() {
    var left = document.querySelector('#left').value.replace(/[^A-Za-z0-9-]/g, '_');
    var right = document.querySelector('#right').value.replace(/[^A-Za-z0-9-]/g, '_');
    getData('/data/' + left + '.json', '/data/' + right + '.json')(doAnalysis);
  }

  document.querySelector('#analyze').addEventListener('click', analyze);
})();
