// Rewrite names that, if overridden in a Javascript object, may change the
// fundamental behaviour of the object.
NameRewriter = (function() {
  var NameRewriter = function(opt_rewrites) {
    this.rewrites = opt_rewrites ||
      Object.getOwnPropertyNames(Object.prototype).map(function(name) {
        return [ name, '$' + name + '$' ];
      });
  };

  NameRewriter.prototype.rewriteName = function(name) {
    for ( var i = 0; i < this.rewrites.length; i++ ) {
      if ( name === this.rewrites[i][0] ) return this.rewrites[i][1];
    }
    return name;
  };

  return NameRewriter;
})();
