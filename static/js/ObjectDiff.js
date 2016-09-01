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

// TODO: This process has largely been abandoned. Possibly replace this with
// set refinements currently in analyze.js.
ObjectDiff = (function() {
  var ObjectDiff = function(a, b, opts) {
    opts = opts || {};
    this.q = new TaskQueue(opts);

    this.a = a;
    this.b = b;
    this.bInvTypes = remap['a:b=>b:[a]'](this.b.types);
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

    this.computeDiff(a.root, b.root, '', 0);
    var prevOnDone = this.q.onDone;
    this.q.onDone = function() {
      this.initLazyData();
      prevOnDone(this);
    }.bind(this);
    this.q.flush();
  };

  // Initialize a-id => b-id map with mapping between type ids. Store -1 on
  // a-ids with no corresponding b-id to ensure that all a-id types exist with
  // truthy values in the map.
  ObjectDiff.prototype.initMap = function() {
    var at = this.a.types;
    var bt = this.b.types;
    var names = Object.getOwnPropertyNames(at);
    for ( var i = 0; i < names.length; i++ ) {
      var name = names[i];
      if ( bt[name] ) {
        this.map[at[name]] = bt[name];
      } else {
        this.map[at[name]] = -1;
      }
    }
    return this.map;
  };

  ObjectDiff.prototype.allExtra = function(abName) {
    var extraIds = [];
    var ab = this[abName].data;
    var ids = Object.getOwnPropertyNames(ab);
    for ( var i = 0; i < ids.length; i++ ) {
      var id = ids[i];
      var names = Object.getOwnPropertyNames(ab[id]);
      for ( var j = 0; j < names.length; j++ ) {
        var name = names[j];
        extraIds.push(ab[id][name]);
      }
    }
    return extraIds;
  };

  ObjectDiff.prototype.initLazyData = function() {
    lazy.memo(this, 'allAExtra', this.allExtra.bind(this, 'a'));
    lazy.memo(this, 'allBExtra', this.allExtra.bind(this, 'b'));
  };

  // Store a conflict between a and b's object graphs. We arrived at a-space
  // node this.a.data[aId][key] and it exists (i.e., this.a.data[aId][key]
  // contains an id). Following the same path in b-space, we arrive at bId.
  // However, this.a.data[aId][key] is mapped to a different b-space id (i.e.,
  // this.map[this.a.data[aId][key]] !== bId).
  ObjectDiff.prototype.storeABConflict = function(aId, key, bId) {
    // console.assert( !! this.map[this.a.data[aId][key]] , 'a-b conflict should have pre-existing mapping');
    this.abConflict[aId] = this.abConflict[aId] || {};
    console.assert( ! this.abConflict[aId][key] , 'duplicate a-b conflict');

    var conflictArr = this.abConflict[aId][key] = this.abConflict[aId][key] ||
          [];
    var existingMapping = this.map[this.a.data[aId][key]];
    if ( existingMapping && conflictArr.indexOf(existingMapping) === -1 )
      conflictArr.push(existingMapping);
    if ( conflictArr.indexOf(bId) === -1 )
      conflictArr.push(bId);

    // if ( ! this.abConflict[aId][key] )
    //   this.abConflict[aId][key] = [ this.map[this.a.data[aId][key]], bId ];
    // else
    //   this.abConflict[aId][key].push(bId);
  };

  ObjectDiff.prototype.storeAExtra = function(aId, aKey) {
    var arr = this.aExtra[aId] = this.aExtra[aId] || [];
    arr.push(aKey);
  };

  ObjectDiff.prototype.storeBExtra = function(bId, bKey) {
    var arr = this.bExtra[bId] = this.bExtra[bId] || [];
    arr.push(bKey);
  };

  ObjectDiff.prototype.computeDiff = function(aId, bId, key, aPrev) {
    // Early exit (1): We have a mapping for aId, but it's not bId.
    if ( this.map[aId] ) {
      if ( this.map[aId] !== bId ) {
        this.storeABConflict(aPrev, key, bId);
      }
      return;
    }
    // Early exit (2): We have no mapping for aId, and bId refers to a primitive
    // type. (Note that a-space primitve types have mappings from .initMap()).
    // Store the conflict, but not a mapping from non-primitive-aId to
    // primitive-bId.
    if ( ! this.map[aId] && this.bInvTypes[bId] ) {
      this.storeABConflict(aPrev, key, bId);
      return;
    }
    this.map[aId] = bId;

    var a = this.a.data[aId];
    var b = this.b.data[bId];

    if ( ! a ) {
      return;
    }

    var aKeys = Object.getOwnPropertyNames(a).sort();
    var bKeys = Object.getOwnPropertyNames(b).sort();
    for ( var i = 0, j = 0; i < aKeys.length || j < bKeys.length; ) {
      var aKey = aKeys[i];
      var bKey = bKeys[j];

      if ( aKey === bKey ) {
        // Key exists in a-space and b-space. Follow it and keep computing diff.
        this.q.enqueue(
          this.computeDiff.bind(this, a[aKey], b[bKey], aKey, aId)
        );
        i++;
        j++;
      } else if ( aKey < bKey || ( typeof aKey !== 'undefined' && typeof bKey === 'undefined' ) ) {
        // a has a key that b doesn't.
        this.storeAExtra(aId, aKey);
        i++;
      } else if (  bKey < aKey || typeof bKey !== 'undefined' && typeof aKey === 'undefined' ) {
        // b has a key that a doesn't.
        this.storeBExtra(bId, bKey);
        j++;
      } else {
        console.assert(false, 'Unreachable');
        debugger;
      }
    }
  };

  return facade(ObjectDiff, {
    properties: [ 'abConflict', 'aExtra', 'bExtra', 'map' ],
  });
})();
