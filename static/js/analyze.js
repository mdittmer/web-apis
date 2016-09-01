(function() {
  function e(selector) {
    return document.querySelector(selector);
  }

  function getData(/* urls */) {
    var len = arguments.length;
    var data = new Array(len);
    var count = 0;
    var ret;
    function store(i) {
      data[i] = this.response;
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
  }

  function refineObjectSet(baseGraph, apis, otherGraph, predicate, exclude) {
    var rtn = [];
    for ( var i = 0; i < apis.length; i++ ) {
      var keys = baseGraph.getKeys(apis[i]);
      for ( var j = 0; j < keys.length; j++ ) {
        var id = otherGraph.lookup(keys[j]);
        if ( predicate(baseGraph, apis[i], otherGraph, id) ) break;
      }
      if ( exclude ^  ( !! id ) ) rtn.push(apis[i]);
    }
    return rtn;
  }

  function doAnalysis(inGraphs, exGraphs, initializer, predicate) {
    if ( inGraphs.length === 0 ) {
      console.error('Analysis requires at least one included implementation');
      return [];
    }
    var os = initializer(inGraphs[0]), i;

    for ( i = 1; i < inGraphs.length; i++ ) {
      os = refineObjectSet(inGraphs[0], os, inGraphs[i], predicate, false);
    }

    for ( i = 0; i < exGraphs.length; i++ ) {
      os = refineObjectSet(inGraphs[0], os, exGraphs[i], predicate, true);
    }

    return os;
  }

  function doAnalyses(inGraphs, exGraphs) {
    var apisE = e('#apis');
    var structsE = e('#structs');

    apisE.textContent = structsE.textContent = '';

    var apis = doAnalysis(
      inGraphs, exGraphs,
      function(graph) { return graph.getFunctions(); },
      function(_, __, graph, id) { return graph.isFunction(id); });
    var structs = doAnalysis(
      inGraphs, exGraphs,
      function(graph) {
        return graph.getAllIds().filter(
          function(id) { return ! graph.isFunction(id); }
        );
      },
      function(_, __, graph, id) { return id && ! graph.isFunction(id); });

    var graph = inGraphs[0];

    apisE.textContent = apis.map(function(id) {
      return graph.getShortestKey(id);
    }).join('\n');
    structsE.textContent = structs.map(function(id) {
      return graph.getShortestKey(id);
    }).join('\n');
  }

  function optValueToURL(label) {
    return '/data/' + label.replace(/ /g, '/');
  }

  function analyze() {
    function inputPaths(inputs) {
      var rtn = new Array(inputs.length);
      for ( var i = 0; i < inputs.length; i++ ) {
        rtn[i] = optValueToURL(inputs[i].value);
      }
      return rtn;
    }

    var inPaths = inputPaths(e('#include-inputs').querySelectorAll('input'));
    var exPaths = inputPaths(e('#exclude-inputs').querySelectorAll('input'));

    var inGraphs, exGraphs;
    function next(i) {
      if ( inGraphs && exGraphs ) doAnalyses(inGraphs, exGraphs);
    }

    function getObjectGraphs(args) {
      return Array.prototype.slice.call(args).map(
        function(data) { return ObjectGraph.fromJSON(data); }
      );
    }

    getData.apply(this, inPaths)(function() {
      inGraphs = getObjectGraphs(arguments);
      next();
    });
    getData.apply(this, exPaths)(function() {
      exGraphs = getObjectGraphs(arguments);
      next();
    });
  }

  var includeExcludeOpts = [];

  function addOpts(datalist) {
    for ( var i = 0; i < includeExcludeOpts.length; i++ ) {
      var opt = document.createElement('option');
      opt.value = includeExcludeOpts[i];
      datalist.appendChild(opt);
    }
  }

  function getKeys(o, s) {
    if (typeof o !== 'object' || o === null ) return [s];
    var keys = Object.getOwnPropertyNames(o);
    var rtn = [];
    for ( var i = 0; i < keys.length; i++ ) {
      var key = keys[i];
      rtn = rtn.concat(getKeys(o[key], s ? s + ' ' + key : key));
    }
    return rtn;
  }

  getData('/list')(function(map) {
    includeExcludeOpts = getKeys(map, '');
    addOpts(e('#environments'));
  });

  function addinputTo(container, datalist) {
    var div = document.createElement('div');
    var input = document.createElement('input');
    var rm = document.createElement('button');

    input.setAttribute('list', datalist.id);
    rm.textContent = '-';
    div.appendChild(input);
    div.appendChild(rm);
    container.appendChild(div);

    rm.addEventListener('click', function() { container.removeChild(div); });
  }

  e('#include-add').addEventListener(
    'click', addinputTo.bind(this, e('#include-inputs'), e('#environments')));
  e('#exclude-add').addEventListener(
    'click', addinputTo.bind(this, e('#exclude-inputs'), e('#environments')));
  e('#analyze').addEventListener('click', analyze);
})();
