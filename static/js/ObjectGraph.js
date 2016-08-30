ObjectGraph = (function() {
  // Attempt to store fingerprint of machine where data is collected.
  var fingerprint = {};
  Fingerprint2 && (new Fingerprint2()).get(function(result, components) {
    fingerprint.result = result;
    fingerprint.components = components;
  });

  // Object identity and/or primitive type data storage.
  var ObjectGraph = function(opts) {
    opts = opts || {};
    this.q = new TaskQueue(opts);
    this.busy = false;
    this.blacklistedObjects = this.blacklistedObjects.slice();
    this.nameRewriter = opts.nameRewriter || new NameRewriter();
    this.keysCache = {};

    // Try to prevent recursion into internal structures.
    this.blacklistedObjects.push(this);
  };

  ObjectGraph.prototype.fingerprint = fingerprint;
  // Map of primitive types (leaves in object graph).
  // NOTE: It must be impossible for $UIDs of visited objects to take on these
  // values.
  ObjectGraph.prototype.types = ObjectGraph.types = {
    'undefined': 1,
    'boolean': 2,
    'number': 3,
    'string': 4,
    'symbol': 5,
    'null': 6,
    'exception': 7,
  };

  // Never visit/store these object keys.
  ObjectGraph.prototype.blacklistedKeys = [ '$UID', '$UID__', '__proto__' ];
  // Never visit/store these objects.
  ObjectGraph.prototype.blacklistedObjects = [];

  ObjectGraph.prototype.initLazyData = function() {
    lazy.memo(this, 'invData',
              remap['a:b:c=>c:b:[a]'].bind(this, this.data));
    lazy.memo(this, 'namedData',
              remap['a:b:c=>b:[(a,c)]'].bind(this, this.data));
    lazy.memo(this, 'invProtos',
              remap['a:b=>b:[a]'].bind(this, this.protos));
  };

  ObjectGraph.prototype.storeObject = function(id) {
    console.assert( ! this.data[id] , 'Repeated store-id');
    this.data[id] = {};
    return this.data[id];
  };

  ObjectGraph.prototype.storeProto = function(oId, protoId) {
    console.assert( ! this.protos[oId] , 'Repeated store-proto');
    this.protos[oId] = protoId;
  };

  // Return an id associated with o if and only if object[key] traversal of o
  // should be skipped. Otherwise, return null.
  //
  // Example of when object[key] traversal should be skipped include when o is
  // of primitive type (or value; e.g., null), or when o has already been
  // visited.
  ObjectGraph.prototype.maybeSkip = function(o) {
    if ( o === null ) return this.types['null'];
    var typeOf = typeof o;
    if ( this.types[typeOf] ) return this.types[typeOf];
    if ( this.data[o.$UID] ) return o.$UID;

    return null;
  };

  // Return true if and only if o[key] is a blacklisted object.
  ObjectGraph.prototype.isPropertyBlacklisted = function(o, key) {
    var value;
    try {
      value = o[key];
    } catch(e) {
      return false;
    }
    for ( var i = 0; i < this.blacklistedObjects.length; i++ ) {
      if ( value === this.blacklistedObjects[i] ) return true;
    }
    return false;
  };

  // Return true if and only if name is a blacklisted key.
  ObjectGraph.prototype.isKeyBlacklisted = function(name) {
    for ( var i = 0; i < this.blacklistedKeys.length; i++ ) {
      if ( name === this.blacklistedKeys[i] ) return true;
    }
    return false;
  };

  // Return a string (possibly identical to name) that is safe to store as a
  // Javascript object key without changing the internal behaviour of the
  // object.
  ObjectGraph.prototype.rewriteName = function(name) {
    return this.nameRewriter.rewriteName(name);
  };

  // Visit the prototype of o, given its dataMap.
  ObjectGraph.prototype.visitPrototype = function(o, dataMap) {
    this.storeProto(o.$UID, this.visitObject(o.__proto__));
  };

  // Visit the property of o named propertyName, given o's dataMap.
  ObjectGraph.prototype.visitProperty = function(o, propertyName, dataMap) {
    var name = this.rewriteName(propertyName);
    try {
      dataMap[name] = this.visitObject(o[propertyName]);
    } catch (e) {
      // console.warn('Error accessing', o.$UID, '.', propertyName);
      dataMap[name] = this.types.exception;
    }
  };

  // Visit an object, o. Return an id for the object, which may contain type
  // information (e.g., number, boolean, null), or indicate the unique identity
  // of the object itself.
  ObjectGraph.prototype.visitObject = function(o) {
    // Don't process object unless we have to.
    var skip = this.maybeSkip(o);
    if ( skip !== null ) return skip;

    // Store function-type info in a special place. We visit them like any
    // other object with identity, so their id will not indicate their type.
    if ( typeof o === 'function' ) this.functions.push(o.$UID);

    var dataMap = this.storeObject(o.$UID);

    // Enqueue work: Visit o's prototype.
    this.q.enqueue(this.visitPrototype.bind(this, o, dataMap));

    // Visit all of o's properties (skipping blacklisted ones).
    var names = Object.getOwnPropertyNames(o);
    for ( var i = 0; i < names.length; i++ ) {
      if ( this.isKeyBlacklisted(names[i]) ||
           this.isPropertyBlacklisted(o, names[i]) ) continue;
      // Enqueue work: Visit o's property.
      this.q.enqueue(this.visitProperty.bind(this, o, names[i], dataMap));
    }

    return o.$UID;
  };

  // Interface method: Visit the object graph rooted at o.
  // Supported options:
  //   onDone: Callback when visiting is finished.
  //           arguments = [this]
  //   key: Initial string key that refers to root object.
  ObjectGraph.prototype.capture = function(o, opts) {
    opts = opts || {};
    var prevOnDone = this.q.onDone;
    if ( this.busy ) {
      this.q.onDone = function() {
        prevOnDone.apply(this, arguments);
        this.capture(o, opts);
      }.bind(this);
      return this;
    }
    this.busy = true;

    this.timestamp = null;
    this.key = opts.key || '';
    this.root = typeof o === 'object' && o !== null ? o.$UID : o;
    this.data = {};
    this.protos = {};
    this.functions = [];
    this.keysCache = {};

    this.q.onDone = function() {
      this.timestamp = (new Date()).getTime();
      this.initLazyData();
      prevOnDone(this);
      opts.onDone && opts.onDone(this);
      this.busy = false;
    }.bind(this);

    // Edge case: Passed-in object is blacklisted. This is not caught by
    // .isPropertyBlacklisted().
    for ( var i = 0; i < this.blacklistedObjects.length; i++ ) {
      if ( o === this.blacklistedObjects[i] ) {
        this.q.flush();
        return this;
      }
    }

    this.visitObject(o);
    this.q.flush();

    return this;
  };

  // Interface method: Get ids of all objects that are functions.
  ObjectGraph.prototype.getFunctions = function() {
    return this.functions.slice();
  };

  // Interface method: Get all ids in the system.
  ObjectGraph.prototype.getAllIds = function() {
    return Object.getOwnPropertyNames(this.data).map(function(strId) {
      return parseInt(strId);
    }).sort();
  };

  // Helper method: Get all keys that refer to an object id, tracking which ids
  // have already been seen.
  ObjectGraph.prototype.getKeys_ = function(id, seen) {
    console.assert( ! seen[id] , 'Revisit object');
    seen[id] = 1;
    if ( id === this.root ) return [this.key];

    var allKeys = [];
    var map = this.invData[id];

    if ( ! map ) {
      console.warn('Orphaned object', id);
      return [];
    }

    // Get all the one-step keys through which other objects point to id.
    var keys = Object.getOwnPropertyNames(map).sort(), i;
    for ( i = 0; i < keys.length; i++ ) {
      var key = keys[i];
      if ( this.isKeyBlacklisted(key) ) continue;

      var ids = map[key];
      for ( var j = 0; j < ids.length; j++ ) {
        var invId = ids[j];

        if ( seen[invId] ) continue;
        // Recurse: Get all complete keys that refer to invData[id][key]; then
        // tack .keys[i] onto the end of each and add them to the list.
        allKeys = allKeys.concat(
          this.getKeys_(parseInt(invId), seen).map(function(prefix) {
            return prefix + '.' + key;
          })
        );
      }
    }

    // Get prototypical direct descendants of this object.
    var invProtos = this.invProtos[id];
    if ( ! invProtos ) return allKeys;
    for ( i = 0; i < invProtos.length; i++ ) {
      var invProtoId = invProtos[i];
      if ( seen[invProtoId] ) continue;
      // Recurse: As above, except via prototype lookup (not property lookup).
      allKeys = allKeys.concat(
        this.getKeys_(parseInt(invProtoId), seen).map(function(prefix) {
          return prefix + '.__proto__';
        })
      );
    }

    return allKeys;
  };

  // Interface method: Get all keys that refer to an object id.
  ObjectGraph.prototype.getKeys = function(id) {
    if ( this.keysCache[id] ) return this.keysCache[id].slice();
    var keys = this.getKeys_(id, {}).sort(function(a, b) {
      return a.length === b.length ? a > b : a.length - b.length;
    });
    this.keysCache[id] = keys;
    return keys.slice();
  };

  // Interface method: Get shortest key that refers to an object id.
  ObjectGraph.prototype.getShortestKey = function(id) {
    return this.getKeys(id)[0] || null;
  };

  // Interface method: Get all keys for all ids; returns a map of the form:
  // { id: [keys] }.
  ObjectGraph.prototype.getAllKeys = function() {
    var ids = this.getAllIds();
    var map = {};
    for ( var i = 0; i < ids.length; i++ ) {
      var id = ids[i];
      map[id] = this.getKeys(id);
    }
    return map;
  };

  // Helper to .lookup() interface method; operates over path array starting
  // from root.
  ObjectGraph.prototype.lookup_ = function(path, root) {
    var id = root, nextId;
    for ( var i = 0; i < path.length; i++ ) {
      var name = path[i];
      if ( name === '__proto__' ) {
        nextId = this.protos[id];
      } else {
        while ( id !== this.types['null'] && ! ( nextId = this.data[id][name] ) )
          id = this.protos[id];
      }
      if ( ! nextId ) return null;
      if ( typeof nextId !== 'number' ) debugger;
      id = nextId;
    }
    return id || null;
  };

  // Interface method: Perform property lookup over a dot-separated key.
  // E.g., .lookup("foo.bar.baz") will start with the root object, then
  // perform property lookup for "foo", then "bar", then "baz", falling back on
  // prototypes as necessary.
  ObjectGraph.prototype.lookup = function(key, opt_root) {
    var root = opt_root || this.root;
    return this.lookup_(key.split('.'), root);
  };

  // What to store when invoking toJSON.
  ObjectGraph.jsonKeys = [ 'timestamp', 'root', 'key', 'data', 'protos',
                             'types', 'keys', 'blacklistedKeys', 'fingerprint',
                             'functions' ];

  // Store minimal data for serialization.
  ObjectGraph.prototype.toJSON = function() {
    var o = {};
    var keys = ObjectGraph.jsonKeys;
    for ( var i = 0; i < ObjectGraph.jsonKeys.length; i++ ) {
      o[keys[i]] = this[keys[i]];
    }
    return o;
  };

  // Load minimal data from serialization.
  ObjectGraph.fromJSON = function(o) {
    var ov = new ObjectGraph();
    var keys =  ObjectGraph.jsonKeys;
    for ( var i = 0; i < ObjectGraph.jsonKeys.length; i++ ) {
      ov[keys[i]] = o[keys[i]];
    }
    ov.initLazyData();
    return ov;
  };

  return facade(ObjectGraph, {
    // No properties: Do not expose data. Access rudimentary data via .toJSON().

    methods: {
      capture: 1, getFunctions: 1, getAllIds: 1, getKeys: 1, getShortestKey: 1,
      getAllKeys: 1, toJSON: 1, lookup: 1,
      blacklistObject: function(o) {
        this.blacklistedObjects.push(o);
      },
    },
    classFns: {
      fromJSON: 'factory',
      blacklistObject: function(o) {
        this.prototype.blacklistedObjects.push(o);
      },
    },
  });
})();
