// Provide a unique id for every object.
(function() {
  var next$UID = (function() {
    // Leave space for "reserved IDs". Useful when values may mean
    // "object id or [some other id]".
    var id = 10000;
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
            { value: next$UID(), enumerable: false });
        }
        return this.$UID__;
      },
      enumerable: false
    }
  );
  Object.prototype.$UID;
})();
