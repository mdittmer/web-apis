ObjectDiff = (function() {
  var ObjectDiff = function(a, b) {
    this.a = a;
    this.b = b;
    // Mapping from a-space-ids to (first found in key-sorted DFS) b-space-id.
    this.map = {};
    this.initMap();
    // Conflicts in mapping a-space-ids to b-space-ids:
    // a-space-id => key-name => [conflicting b-space-ids].
    this.abConflict = {};
    // Object keys in a missing from b:
    // a-space-id => key-name.
    this.aExtra = {};
    // Object keys in b missing from a:
    // b-space-id => key-name.
    this.bExtra = {};

    this.computeDiff(a.root, b.root);
  };

  // Initialize a-id => b-id map with mapping between type ids.
  ObjectDiff.prototype.initMap = function() {
    var at = this.a.types;
    var bt = this.b.types;
    var names = Object.getOwnPropertyNames(at);
    for ( var i = 0; i < names.length; i++ ) {
      var name = names[i];
      if ( bt[name] ) {
        this.map[at[name]] = bt[name];
      }
    }
    return this.map;
  };

  ObjectDiff.prototype.storeABConflict = function(aId, key, bId) {
    console.assert( !! this.map[this.a.data[aId][key]] , 'a-b conflict should have pre-existing mapping');
    if ( ! this.abConflict[aId] ) this.abConflict[aId] = {};
    if ( ! this.abConflict[aId][key] )
      this.abConflict[aId][key] = [ this.map[this.a.data[aId][key]], bId ];
    else
      this.abConflict[aId][key].push(bId);
  };

  ObjectDiff.prototype.storeAExtra = function(aId, aKey) {
    console.assert( ! this.aExtra[aId] , 'Extra a key reported twice');
    this.aExtra[aId] = aKey;
  };

  ObjectDiff.prototype.storeBExtra = function(bId, bKey) {
    console.assert( ! this.bExtra[bId] , 'Extra b key reported twice');
    this.bExtra[bId] = bKey;
  };

  ObjectDiff.prototype.computeDiff = function(aId, bId) {
    console.assert( ! this.map[aId] , 'Recomputing diff');
    this.map[aId] = bId;

    var a = this.a.data[aId];
    var b = this.b.data[bId];
    var aKeys = Object.getOwnPropertyNames(a).sort();
    var bKeys = Object.getOwnPropertyNames(b).sort();
    for ( var i = 0, j = 0; i < aKeys.length || j < bKeys.length; ) {
      var aKey = aKeys[i];
      var bKey = bKeys[j];
      if ( aKey === bKey ) {
        // Both a and b have this key.
        if ( this.map[a[aKey]] && this.map[a[aKey]] !== b[bKey] ) {
          // We have a mapping from a[aKey], but it's inconsistent with
          // b[bKey]; store this conflict.
          this.storeABConflict(aId, bKey, b[bKey]);
        } else if ( ! this.map[a[aKey]] &&
                    ( typeof a[aKey] === 'number' &&
                      typeof b[bKey] === 'number' ) ) {
          // No mapping from a-space to b-sapce over a[aKey] yet. Make one to
          // b[bKey] and compute their difference.
          this.computeDiff(a[aKey], b[bKey]);
        } // Else: a[aKey] already mapped to b[bKey]. Do nothing.
        i++;
        j++;
      } else if ( aKey < bKey ) {
        // Now a has a key that b doesn't.
        this.storeAExtra(aId, aKey);
        i++;
      } else {
        // Now b has a key that a doesn't.
        this.storeBExtra(bId, bKey);
        j++;
      }
    }
  };

  var PublicObjectDiff = function(a, b) {
    this.objectDiff = new ObjectDiff(a, b);
    this.a = this.objectDiff.a;
    this.b = this.objectDiff.b;
    this.abConflict = this.objectDiff.abConflict;
    this.aExtra = this.objectDiff.aExtra;
    this.bExtra = this.objectDiff.bExtra;
  };

  return PublicObjectDiff;
})();
