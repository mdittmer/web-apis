facade = function(ctor, opts) {
  var Ctor = function() {
    this._ = Object.create(ctor.prototype);

    if ( opts.properties ) {
      for ( var i = 0; i < opts.properties.length; i++ ) {
        (function(name) {
          Object.defineProperty(this, name, {
            get: function() { return this._[name]; },
            set: function(value) { return this._[name] = value; },
            enumerable: true,
          });
        }.bind(this))(opts.properties[i]);
      }
    }

    ctor.apply(this._, arguments);
  };

  var keys, i;

  if ( opts.methods ) {
    keys = Object.getOwnPropertyNames(opts.methods);
    for ( i = 0; i < keys.length; i++ ) {
      (function(key) {
        if ( typeof opts.methods[key] !== 'function' ) {
          Ctor.prototype[key] = function() {
            return this._[key].apply(this._, arguments);
          };
        } else {
          Ctor.prototype[key] = function() {
            return opts.methods[key].apply(this._, arguments);
          };
        }
      })(keys[i]);
    }
  }

  if ( opts.classFns) {
    keys = Object.getOwnPropertyNames(opts.classFns);
    for ( i = 0; i < keys.length; i++ ) {
      (function(key) {
        if ( typeof opts.classFns[key] !== 'function' ) {
          Ctor[key] = function() {
            return ctor[key].apply(ctor, arguments);
          };
        } else {
          Ctor[key] = function() {
            return opts.classFns[key].apply(ctor, arguments);
          };
        }
      })(keys[i]);
    }
  }

  return Ctor;
};
