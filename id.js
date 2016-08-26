// Provide a unique id for every object.
(function() {
  var nextId = (function() {
    // Leave space for "reserved IDs". Useful when values may mean
    // "object id or [some other id]".
    var id = 10000;
    return function() { return id++; };
  })();

  // Storage objects misbehave when we attempt to .defineProperty() on them.
  // Instead, store an id mapping in a list so that when Storage objects are
  // encountered their ids are managed appropriately.
  var storageIds = [];
  function getStorageId(o) {
    for ( var i = 0; i < storageIds.length; i++ ) {
      if ( o === storageIds[i][0] ) return storageIds[i][1];
    }

    var id = nextId();
    storageIds.push([o, id]);
    return id;
  }

  Object.defineProperty(
    Object.prototype,
    '$UID',
    {
      get: function() {
        // Catch Storage object corner case.
        if ( window.Storage && window.Storage.prototype &&
             ( window.Storage.protoype === this ||
               window.Storage.prototype.isPrototypeOf(this) ) ) {
          return getStorageId(this);
        }

        if ( ! this.hasOwnProperty('$UID__') ) {
          var id = nextId();
          Object.defineProperty(this, '$UID__', {
            value: nextId(),
            enumerable: false,
          });
        }
        return this.$UID__;
      },
      enumerable: false,
    }
  );
  Object.prototype.$UID;
})();
