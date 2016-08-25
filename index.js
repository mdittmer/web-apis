ObjectVisitor = (function() {
  var fingerprint = {};
  (new Fingerprint2()).get(function(result, components) {
    fingerprint.result = result;
    fingerprint.components = components;
  });

  var Q = function(opt_onDone, opt_maxDequeueSize) {
    this.q = [];
    this.onDone = opt_onDone || Q.prototype.onDone;
    this.maxDequeueSize = opt_maxDequeueSize || Q.prototype.maxDequeueSize;
  };

  Q.prototype.maxDequeueSize = 10;
  Q.prototype.onDone = function() {};
  Q.prototype.async = function(f) {
    window.setTimeout(f, 0);
  };
  Q.prototype.enqueue = function(/* fs */) {
    for ( var i = 0; i < arguments.length; i++ ) {
      this.q.push(arguments[i]);
    }
  };
  Q.prototype.flush = function() {
    for ( var i = 0; i < this.maxDequeueSize && this.q.length > 0; i++ ) {
      var f = this.q.shift();
      f();
    }
    if ( this.q.length > 0 ) this.async(this.flush.bind(this));
    else                     this.onDone();
  };

  var ObjectVisitor = function() {
    this.q = new Q();
    this.busy = false;
  };

  ObjectVisitor.prototype.types = ObjectVisitor.types = {
    'undefined': 1,
    'boolean': 2,
    'number': 3,
    'string': 4,
    'symbol': 5,
    'null': 6,
    'exception': 7,
  };
  ObjectVisitor.prototype.keys = {
    proto: '^P',
    invProto: '^I',
    key: '^K',
  };

  ObjectVisitor.next$UID = (function() {
    var id = 1000;
    return function() { return id++; };
  })();

  Object.defineProperty(
    Object.prototype,
    '$UID',
    {
      get: function() {
        if ( ! Object.hasOwnProperty.call(this, '$UID__') ) {
          Object.defineProperty(
            this,
            '$UID__',
            { value: ObjectVisitor.next$UID(), enumerable: false });
        }
        return this.$UID__;
      },
      enumerable: false
    }
  );
  Object.prototype.$UID;

  ObjectVisitor.prototype.blacklistedKeys = [ '$UID', '$UID__', '__proto__' ];
  ObjectVisitor.prototype.blacklistedObjects = [ Fingerprint2 ];
  ObjectVisitor.prototype.rewrite =
    Object.getOwnPropertyNames(Object.prototype).map(function(name) {
      return [ name, '$' + name + '$' ];
    });

  ObjectVisitor.prototype.maybeSkip = function(o) {
    if ( o === null ) return this.types['null'];
    var typeOf = typeof o;
    if ( this.types[typeOf] ) return this.types[typeOf];
    if ( this.data[o.$UID] ) return o.$UID;
    for ( var i = 0; i < this.blacklistedObjects; i++ ) {
      if ( o === this.blacklistedObjects[i] ) return o.$UID;
    }

    return null;
  };

  ObjectVisitor.prototype.isBlacklisted = function(name) {
    for ( var i = 0; i < this.blacklistedKeys.length; i++ ) {
      if ( name === this.blacklistedKeys[i] ) return true;
    }
    return false;
  };

  ObjectVisitor.prototype.rewriteName = function(name) {
    for ( var i = 0; i < this.rewrite.length; i++ ) {
      if ( name === this.rewrite[i][0] ) return this.rewrite[i][1];
    }
    return name;
  };

  ObjectVisitor.prototype.visitPrototype = function(o, dataMap, key) {
    if ( o.hasOwnProperty(this.keys.proto) ) {
      console.warn('Data loss:', o.$UID, '.', this.keys.proto, 'was',
                   o[this.keys.proto]);
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

  ObjectVisitor.prototype.visitProperty = function(o, propertyName, dataMap,
                                                   key) {
    try {
      var value = o[propertyName];
      var name = this.rewriteName(propertyName);
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
      console.warn('Error accessing', o.$UID, '.', propertyName);
      dataMap[propertyName] = this.types.exception;
    }
  };

  ObjectVisitor.prototype.visitObject = function(o, key) {
    var skip = this.maybeSkip(o);
    if ( skip !== null ) return skip;

    var dataMap = this.data[o.$UID] = {};
    dataMap[this.keys.key] = key;

    this.q.enqueue(this.visitPrototype.bind(this, o, dataMap, key));

    var names = Object.getOwnPropertyNames(o);
    for ( var i = 0; i < names.length; i++ ) {
      if ( this.isBlacklisted(names[i]) ) continue;
      this.q.enqueue(this.visitProperty.bind(this, o, names[i], dataMap, key));
    }

    return o.$UID;
  };

  ObjectVisitor.prototype.visit = function(o, onDone) {
    if ( this.busy ) {
      var prevOnDone = this.q.onDone;
      this.q.onDone = function() {
        prevOnDone.apply(this, arguments);
        this.visit(o, onDone);
      }.bind(this);
      return;
    }
    this.busy = true;

    this.root = typeof o === 'object' && o !== null ? o.$UID : o;
    this.data = {};
    this.namedData = {};
    this.invData = {};

    this.q.onDone = function() {
      onDone(this);
      this.busy = false;
    }.bind(this);

    this.visitObject(o, '');
    this.q.flush();

    return this;
  };

  ObjectVisitor.jsonKeys = [ 'root', 'data', 'namedData', 'invData', 'types',
                             'keys', 'blacklistedKeys' ];

  ObjectVisitor.prototype.toJSON = function() {
    var o = {};
    var keys =  ObjectVisitor.jsonKeys;
    for ( var i = 0; i < ObjectVisitor.jsonKeys; i++ ) {
      o[keys[i]] = this[keys[i]];
    }
    return o;
  };

  ObjectVisitor.fromJSON = function(o) {
    var ov = new ObjectVisitor();
    var keys =  ObjectVisitor.jsonKeys;
    for ( var i = 0; i < ObjectVisitor.jsonKeys; i++ ) {
      ov[keys[i]] = o[keys[i]];
    }
    return ov;
  };

  var PublicObjectVisitor = function() {
    this.visitor = new ObjectVisitor();
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

  ObjectVisitor.prototype.blacklistedObjects.push(PublicObjectVisitor);

  return PublicObjectVisitor;
})();
