lazy = (function() {
  var memo = function(o, key, f) {
    var value, computed = false;
    Object.defineProperty(o, key, {
      get: function() {
        if ( computed ) return value;
        value = f();
        computed = true;
        return value;
      },
      configurable: true,
    });
  };

  return { memo: memo };
})();
