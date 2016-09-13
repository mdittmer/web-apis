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

(function(define) {
  define([ 'stdlib', 'ObjectGraph' ], function(stdlib, ObjectGraph) {
    // Get an element from the DOM.
    function e(selector) {
      return document.querySelector(selector);
    }

    // Helper for refineObjectSet below.
    //
    // Get keys associated with an object in an object graph, with and without
    // __proto__ lookups.
    function getRelaxedKeys(baseGraph, id) {
      var keys = baseGraph.getKeys(id);
      var keys2 = keys.slice().map(function(key) {
        return key.replace('.__proto__.', '.');
      });
      for ( var i = 0; i < keys2.length; i++ ) {
        if ( keys.indexOf(keys2[i]) === -1 ) {
          keys.push(keys2[i]);
        }
      }
      return keys.sort();
    }

    // Strip function's own properties from primitive report. Actual function
    // differences show up in APIs report.
    var skipFunctionKeys = [ 'length', 'name', 'arguments', 'caller', 'callee' ];
    function initPrimitiveSet(graph, ids) {
      var rtn = {};
      for ( var i = 0; i < ids.length; i++ ) {
        var keys = graph.getObjectKeys(ids[i], graph.isType);
        if ( graph.isFunction(ids[i]) ) keys = keys.filter(function(key) {
          return skipFunctionKeys.indexOf(key) === -1;
        });
        if ( keys.length > 0 ) rtn[ids[i]] = keys;
      }
      return rtn;
    }
    function excludeAllFromPrimitiveSet(primitives, id) {
      if ( primitives[id] === undefined ) return primitives;
      delete primitives[id];
      return primitives;
    }
    function excludeFromPrimitiveSet(primitives, id, key) {
      if ( ! primitives[id] ) return primitives;
      primitives[id] = primitives[id].filter(function(existingKey) {
        return existingKey !== key;
      });
      if ( primitives[id].length === 0 ) delete primitives[id];
      return primitives;
    }
    function refinePrimitiveSet(baseGraph, primitivePredicate, ids, primitives,
                                otherGraph) {
      var i, j, k;
      for ( i = 0; i < ids.length; i++ ) {
        var keys = getRelaxedKeys(baseGraph, ids[i]);

        var id;
        for ( j = 0; j < keys.length; j++ ) {
          id = otherGraph.lookup(keys[j]);
        }
        console.assert(id);

        var baseKeys = baseGraph.getObjectKeys(ids[i], baseGraph.isType);
        var otherKeys = otherGraph.getObjectKeys(id, otherGraph.isType);
        for ( j = k = 0; j < baseKeys.length && k < otherKeys.length; ) {
          var baseValue = baseGraph.lookup(
            baseGraph.getShortestKey(ids[i]) + '.' + baseKeys[j]
          );
          var otherValue = otherGraph.lookup(
            otherGraph.getShortestKey(id) + '.' + otherKeys[k]
          );

          var predicate = primitivePredicate.bind(this, baseGraph, ids[i],
                                                  baseValue, otherGraph, id,
                                                  otherValue);
          if ( baseKeys[j] === otherKeys[k] ) {
            // base and other both contain key.
            j++;
            k++;
          } else if ( baseKeys[j] < otherKeys[k] ) {
            // base contains key missing from other.
            if ( predicate(baseKeys[j]) )
              excludeFromPrimitiveSet(primitives, ids[i], baseKeys[j]);
            j++;
          } else {
            // other contains key missing from base.
            k++;
          }
        }
      }
      return primitives;
    }

    function doPrimitiveAnalysis(inGraphs, exGraphs, primitivePredicate) {
      if ( inGraphs.length === 0 ) {
        console.error('Analysis requires at least one included implementation');
        return {};
      }

      var os = doObjectAnalysis(
        inGraphs, exGraphs,
        function(graph) {
          return graph.getAllIds();
        },
        function(_, __, graph, id) { return !! id; }
      ), i;
      var primitives = initPrimitiveSet(inGraphs[0], os);
      var refiner = refinePrimitiveSet.bind(
        this, inGraphs[0], primitivePredicate, os);

      for ( i = 1; i < inGraphs.length; i++ ) {
        primitives = refiner(primitives, inGraphs[i]);
      }

      return primitives;
    }

    // Helper for doObjectAnalysis below.
    //
    // Refine the object set of baseGraph-based ids. The new set includes only
    // ids that have/do-not-have corresponding ids in otherGraph that return
    // true against predicate. The "have" / "do-not-have" is determined by the
    // value of exclude. When exclude is false, such corresponding ids must
    // exist in otherGraph, and vice-versa. By "corresponding" is meant "an
    // otherGraph-based id was found performing key lookup against the keys
    // associated with the baseGraph-based id".
    function refineObjectSet(baseGraph, predicate, ids, otherGraph, exclude) {
      var rtn = [];
      for ( var i = 0; i < ids.length; i++ ) {
        var keys = getRelaxedKeys(baseGraph, ids[i]);
        for ( var j = 0; j < keys.length; j++ ) {
          var id = otherGraph.lookup(keys[j]);
          if ( predicate(baseGraph, ids[i], otherGraph, id) ) break;
          else                                                id = null;
        }
        if ( exclude ^  ( !! id ) )
          rtn.push(ids[i]);
      }
      return rtn;
    }

    // Find the set of objects that are found in all inGraphs and not found
    // in all outGraphs. Start the refinement using initializer against the first
    // inGraph. Deem objects in graphs as relevant according to the return value
    // of predicate.
    function doObjectAnalysis(inGraphs, exGraphs, initializer, predicate) {
      if ( inGraphs.length === 0 ) {
        console.error('Analysis requires at least one included implementation');
        return [];
      }
      var os = initializer(inGraphs[0]), i;
      var refiner = refineObjectSet.bind(this, inGraphs[0], predicate);

      for ( i = 1; i < inGraphs.length; i++ ) {
        os = refiner(os, inGraphs[i], false);
      }

      for ( i = 0; i < exGraphs.length; i++ ) {
        os = refiner(os, exGraphs[i], true);
      }

      return os;
    }

    // Perform object graph set refinement by including objects in inGraphs and
    // excluding objects in exGraphs. Do three refinements:
    // (1) APIs: Consider only function objects;
    // (2) Structs: Consider only non-function objects.
    // (3) Primitives: Consider object[key] that store primitive values.
    // Finally, output results to DOM.
    function doAnalyses(inGraphs, exGraphs) {
      var apisE = e('#apis');
      var structsE = e('#structs');
      var primitivesE = e('#primitives');

      apisE.textContent = structsE.textContent = primitivesE.textContent = '';

      var apis = doObjectAnalysis(
        inGraphs, exGraphs,
        function(graph) { return graph.getFunctions(); },
        function(_, __, graph, id) { return graph.isFunction(id); }
      );
      var structs = doObjectAnalysis(
        inGraphs, exGraphs,
        function(graph) {
          return graph.getAllIds().filter(
            function(id) { return ! graph.isFunction(id); }
          );
        },
        function(_, __, graph, id) { return id && ! graph.isFunction(id); }
      );
      var primitives = doPrimitiveAnalysis(
        inGraphs, exGraphs, function() { return true; }
        // function(graph) { return graph.getAllIds(); },
        // function(_, __, ___, otherId) { return ( !! otherId ); },
        // function(g, id, v, g2, id2, v2, k) {
        //   if ( k === 'webkitFullScreenKeyboardInputAllowed' ) debugger;
        //   return !! id;
        // }
        // function(baseGraph, baseId, _, otherGraph, otherId, __, key) {
        //   var graph = baseGraph || otherGraph;
        //   var id = baseGraph ? baseId : otherId;
        //   return ( ! graph.isFunction(id) ) ||
        //     [ 'name', 'length' ].indexOf(key) === -1;
        // }
      );

      var graph = inGraphs[0];

      // TODO: Should this be decoupled from data processing?
      apisE.textContent = apis.map(function(id) {
        return graph.getShortestKey(id);
      }).join('\n');
      structsE.textContent = structs.map(function(id) {
        return graph.getShortestKey(id);
      }).join('\n');
      primitivesE.textContent = Object.getOwnPropertyNames(primitives).map(
        function(id) {
          var objectKey = graph.getShortestKey(id);
          var primitiveKeys = primitives[id];
          return primitiveKeys.map(function(primitiveKey) {
            return objectKey + '.' + primitiveKey;
          }).join('\n');
        }
      ).join('\n');
    }

    // Convert datalist option value to a data retrieval URL. This is tightly
    // coupled to loadData('/list') callback below, and to server's data routing
    // routing scheme.
    function optValueToURL(label) {
      return '/data/' + label.replace(/ /g, '/');
    }

    // Gather configuration from DOM inputs, perform analyses, and output results.
    function analyze() {
      // Map input option values to URLs.
      function inputPaths(inputs) {
        var rtn = new Array(inputs.length);
        for ( var i = 0; i < inputs.length; i++ ) {
          rtn[i] = optValueToURL(inputs[i].value);
        }
        return rtn;
      }

      var inPaths = inputPaths(e('#include-inputs').querySelectorAll('input'));
      var exPaths = inputPaths(e('#exclude-inputs').querySelectorAll('input'));

      // Continuation hack: Keep trying until inGraphs and exGraphs are populated,
      // then do analyses.
      var inGraphs = null, exGraphs = exPaths.length === 0 ? [] : null;
      function next(i) {
        if ( inGraphs && exGraphs ) doAnalyses(inGraphs, exGraphs);
      }

      // Map data fetched from URLs to ObjectGraph instances.
      function getObjectGraphs(jsons) {
        return jsons.map(function(data) { return ObjectGraph.fromJSON(data); });
      }

      // Map URL paths to inGraphs and exGraphs, then do analyses.
      stdlib.loadData(inPaths, { responseType: 'json' })(function(jsons) {
        inGraphs = getObjectGraphs(jsons);
        next();
      });
      stdlib.loadData(exPaths, { responseType: 'json' })(function(jsons) {
        exGraphs = getObjectGraphs(jsons);
        next();
      });
    }

    var includeExcludeOpts = [];

    // Add <option>s to the given <datalist>.
    function addOpts(datalist) {
      for ( var i = 0; i < includeExcludeOpts.length; i++ ) {
        var opt = document.createElement('option');
        opt.value = includeExcludeOpts[i];
        datalist.appendChild(opt);
      }
    }

    // Get the full set of nested keys over a Javascript object.
    // This is used to transform output from the "/list" URL to a collection of
    // options.
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

    // Get a list of environments the server has data for, and add them to a
    // <datalist>.
    stdlib.loadData('/list', { responseType: 'json' })(function(map) {
      includeExcludeOpts = getKeys(map, '');
      addOpts(e('#environments'));
    });

    // Helper function for adding environments to include/exclude lists in DOM.
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

    return null;
  });
})((function() {
  if ( typeof module !== 'undefined' && module.exports ) {
    return function(deps, factory) {
      if ( ! factory ) module.exports = deps();
      else             module.exports = factory.apply(this, deps.map(require));
    };
  } else if ( typeof define === 'function' && define.amd ) {
    return define;
  } else if ( typeof window !== 'undefined' ) {
    return function(deps, factory) {
      if ( ! document.currentScript ) throw new Error('Unknown module name');

      window[
        document.currentScript.getAttribute('src').split('/').pop().split('#')[
          0].split('?')[0].split('.')[0]
      ] = (factory || deps).apply(
        this, factory ? deps.map(function(name) { return window[name]; }) : []);
    };
  } else {
    throw new Error('Unknown environment');
  }
})());
