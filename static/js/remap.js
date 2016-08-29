remap = {
  '[]=>{}': function(arr) {
    var map = {};
    for ( var i = 0; i < arr.length; i++ ) {
      map[arr[i]] = 1;
    }
    return map;
  },
  // { a: { b }, c: { d }, e: { b } }
  // =>
  // { b: [a, e], d: [c] }
  'a:b=>b:[a]': function(map) {
    var newMap = {};
    var keys = Object.getOwnPropertyNames(map);
    for ( var i = 0; i < keys.length; i++ ) {
      var key = keys[i];
      var arr = newMap[map[key]] = newMap[map[key]] || [];
      arr.push(key);
    }
    return newMap;
  },
  // { a: { b: c }, d: { b: c }, e: { b: f } }
  // =>
  // { c: { b: [a, d] }, f: { b: [e] } }
  'a:b:c=>c:b:[a]': function(map) {
    var newMap = {};
    var keys1 = Object.getOwnPropertyNames(map);
    for ( var i = 0; i < keys1.length; i++ ) {
      var key1 = keys1[i];
      var keys2 = Object.getOwnPropertyNames(map[key1]);
      for ( var j = 0; j < keys2.length; j++ ) {
        var key2 = keys2[j];
        var inner1 = newMap[map[key1][key2]] = newMap[map[key1][key2]] || {};
        var inner2 = inner1[key2] = inner1[key2] || [];
        inner2.push(key1);
      }
    }
    return newMap;
  },
  // { a: { b: c }, d: { b: c }, e: { f: g } }
  // =>
  // { b: [ [a, c], [d, c]], f: [ [e, g] ] }
  'a:b:c=>b:[(a,c)]': function(map) {
    var newMap = {};
    var keys1 = Object.getOwnPropertyNames(map);
    for ( var i = 0; i < keys1.length; i++ ) {
      var key1 = keys1[i];
      var keys2 = Object.getOwnPropertyNames(map[key1]);
      for ( var j = 0; j < keys2.length; j++ ) {
        var key2 = keys2[j];
        if ( ! newMap[key2] ) newMap[key2] = [];
        newMap[key2].push([ key1, map[key1][key2] ]);
      }
    }
    return newMap;
  }
};
