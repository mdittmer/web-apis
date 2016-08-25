ObjectVisitor = (function() {
  // Attempt to store fingerprint of machine where data is collected.
  var fingerprint = {};
  Fingerprint2 && (new Fingerprint2()).get(function(result, components) {
    fingerprint.result = result;
    fingerprint.components = components;
  });

  var noop = function() {};

  // Private async task queue implementation; suitable for depth-first-search
  // over large object graphs without hanging.
  var Q = function(opts) {
    opts = opts || {};
    this.q = [];
    this.maxDequeueSize = opts.maxDequeueSize || this.maxDequeueSize;
    this.onTick = opts.onTick || this.onTick;
    this.onDone = opts.onDone || this.onDone;
  };

  // Number of queued functions to run before allowing async tick.
  Q.prototype.maxDequeueSize = 10;
  // Singleton listeners for queue-fully-flushed and async-tick.
  Q.prototype.onDone = Q.prototype.onTick = noop;
  Q.prototype.async = function(f) {
    window.setTimeout(f, 0);
  };
  Q.prototype.enqueue = function(/* fs */) {
    for ( var i = 0; i < arguments.length; i++ ) {
      this.q.push(arguments[i]);
    }
  };
  Q.prototype.flush = function() {
    this.onTick();
    for ( var i = 0; i < this.maxDequeueSize && this.q.length > 0; i++ ) {
      var f = this.q.shift();
      f();
    }
    if ( this.q.length > 0 ) this.async(this.flush.bind(this));
    else                     this.onDone();
  };

  // Object identity and/or primitive type data storage.
  var ObjectVisitor = function(opts) {
    opts = opts || {};
    this.q = new Q(opts);
    this.busy = false;
    this.blacklistedObjects = this.blacklistedObjects.slice();
    this.nameRewriter = opts.nameRewriter || new NameRewriter();

    // Try to prevent recursion into internal structures.
    this.blacklistedObjects.push(this);
  };

  ObjectVisitor.prototype.fingerprint = fingerprint;
  // Map of primitive types (leaves in object graph).
  // NOTE: It must be impossible for $UIDs of visited objects to take on these
  // values.
  ObjectVisitor.prototype.types = ObjectVisitor.types = {
    'undefined': 1,
    'boolean': 2,
    'number': 3,
    'string': 4,
    'symbol': 5,
    'null': 6,
    'exception': 7,
  };
  // Custom keys used to store metadata.
  // TODO: We could probably store this metadata elsewhere, rather than risking
  // key name overlap (however unlikely).
  ObjectVisitor.prototype.keys = {
    proto: '^P',
    invProto: '^I',
    key: '^K',
  };

  // Never visit/store these object keys.
  ObjectVisitor.prototype.blacklistedKeys = [ '$UID', '$UID__', '__proto__' ];
  // Never visit/store these objects.
  ObjectVisitor.prototype.blacklistedObjects = [];

  // Return an id associated with o if and only if object[key] traversal of o
  // should be skipped. Otherwise, return null.
  //
  // Example of when object[key] traversal should be skipped include when o is
  // of primitive type (or value; e.g., null), or when o has already been
  // visited.
  ObjectVisitor.prototype.maybeSkip = function(o) {
    if ( o === null ) return this.types['null'];
    var typeOf = typeof o;
    if ( this.types[typeOf] ) return this.types[typeOf];
    if ( this.data[o.$UID] ) return o.$UID;
    for ( var i = 0; i < this.blacklistedObjects.length; i++ ) {
      if ( o === this.blacklistedObjects[i] ) return o.$UID;
    }

    return null;
  };

  // Return true if and only if name is a blacklisted key.
  ObjectVisitor.prototype.isKeyBlacklisted = function(name) {
    for ( var i = 0; i < this.blacklistedKeys.length; i++ ) {
      if ( name === this.blacklistedKeys[i] ) return true;
    }
    return false;
  };

  // Return a string (possibly identical to name) that is safe to store as a
  // Javascript object key without changing the internal behaviour of the
  // object.
  ObjectVisitor.prototype.rewriteName = function(name) {
    return this.nameRewriter.rewriteName(name);
  };

  // Visit the prototype of o, given its dataMap, and the key that was used to
  // look it up.
  ObjectVisitor.prototype.visitPrototype = function(o, dataMap, key) {
    if ( o.hasOwnProperty(this.keys.proto) ) {
      console.warn('Data loss:', o.$UID, '.', this.keys.proto, 'was',
                   o[this.keys.proto]);
      debugger;
    }
    var proto = o.__proto__;
    dataMap[this.keys.proto] = this.visitObject(proto, key + '.__proto__');

    if ( proto === null ) return;

    var invDataMap = this.invData[proto.$UID] = this.invData[proto.$UID] || {};
    if ( invDataMap[this.keys.invProto] ) {
      invDataMap[this.keys.invProto].push(o.$UID);
    } else {
      invDataMap[this.keys.invProto] = [o.$UID];
    }
  };

  // Visit the property of o named propertyName, given o's dataMap and the key
  // that was used to look it up.
  ObjectVisitor.prototype.visitProperty = function(o, propertyName, dataMap,
                                                   key) {
    var name = this.rewriteName(propertyName);
    try {
      var value = o[propertyName];
      var valueId = dataMap[name] = this.visitObject(value, key + '.' +
                                                     propertyName);

      this.namedData[propertyName] = this.namedData[propertyName] || [];
      this.namedData[propertyName].push([o.$UID, valueId]);

      if ( value === null || this.types[typeof value] ) return;

      var invDataMap = this.invData[value.$UID] = this.invData[value.$UID] ||
            {};
      if ( invDataMap[name] ) {
        invDataMap[name].push(o.$UID);
      } else {
        invDataMap[name] = [o.$UID];
      }
    } catch (e) {
      // console.warn('Error accessing', o.$UID, '.', propertyName);
      dataMap[name] = this.types.exception;
    }
  };

  // Visit an object, o, given the key that was used to look it up. Return an id
  // for the object, which may contain type information (e.g., number, boolean,
  // null), or indicate the unique identity of the object itself.
  ObjectVisitor.prototype.visitObject = function(o, key) {
    // Don't process object unless we have to.
    var skip = this.maybeSkip(o);
    if ( skip !== null ) return skip;

    // Store function-type info in a special place. We visit them like any
    // other object with identity, so their id will not indicate their type.
    if ( typeof o === 'function' ) this.functions.push(o.$UID);

    var dataMap = this.data[o.$UID] = {};
    dataMap[this.keys.key] = key;

    // Enqueue work: Visit o's prototype.
    this.q.enqueue(this.visitPrototype.bind(this, o, dataMap, key));

    // Visit all of o's properties (skipping blacklisted ones).
    var names = Object.getOwnPropertyNames(o);
    for ( var i = 0; i < names.length; i++ ) {
      if ( this.isKeyBlacklisted(names[i]) ) continue;
      // Enqueue work: Visit o's property.
      this.q.enqueue(this.visitProperty.bind(this, o, names[i], dataMap, key));
    }

    return o.$UID;
  };

  // Interface method: Visit the object graph rooted at o.
  // Supported options:
  //   onDone: Callback when visiting is finished.
  //           arguments = [this]
  //   key: Initial string key that refers to root object.
  ObjectVisitor.prototype.visit = function(o, opts) {
    opts = opts || {};
    var prevOnDone = this.q.onDone;
    if ( this.busy ) {
      this.q.onDone = function() {
        prevOnDone.apply(this, arguments);
        this.visit(o, opts);
      }.bind(this);
      return this;
    }
    this.busy = true;

    this.root = typeof o === 'object' && o !== null ? o.$UID : o;
    this.data = {};
    this.namedData = {};
    this.invData = {};
    this.functions = [];

    this.q.onDone = function() {
      prevOnDone(this);
      opts.onDone && opts.onDone(this);
      this.busy = false;
    }.bind(this);

    this.visitObject(o, opts.key || '');
    this.q.flush();

    return this;
  };

  // What to store when invoking toJSON.
  ObjectVisitor.jsonKeys = [ 'root', 'data', 'namedData', 'invData', 'types',
                             'keys', 'blacklistedKeys', 'fingerprint',
                             'functions' ];

  ObjectVisitor.prototype.toJSON = function() {
    var o = {};
    var keys = ObjectVisitor.jsonKeys;
    for ( var i = 0; i < ObjectVisitor.jsonKeys.length; i++ ) {
      o[keys[i]] = this[keys[i]];
    }
    return o;
  };

  ObjectVisitor.fromJSON = function(o) {
    var ov = new ObjectVisitor();
    var keys =  ObjectVisitor.jsonKeys;
    for ( var i = 0; i < ObjectVisitor.jsonKeys.length; i++ ) {
      ov[keys[i]] = o[keys[i]];
    }
    return ov;
  };

  // Public interface for ObjectVisitor. This wrapper simply emphasizes what
  // methods are intended to be a part of the interface. (Looking up
  // this.visitor would, of course, expose all methods, but don't do that.)
  var PublicObjectVisitor = function(opts) {
    this.visitor = new ObjectVisitor(opts);
  };
  PublicObjectVisitor.blacklistObject = function(o) {
    ObjectVisitor.prototype.blacklistedObjects.push(o);
  };
  [ 'visit', 'toJSON' ].forEach(function(name) {
    PublicObjectVisitor.prototype[name] = function() {
      return this.visitor[name].apply(this.visitor, arguments);
    };
  });
  [ 'fromJSON' ].forEach(function(name) {
    PublicObjectVisitor[name] = function() {
      return ObjectVisitor[name].apply(ObjectVisitor, arguments);
    };
  });

  return PublicObjectVisitor;
})();
