(function() {
  var dataElement = document.body.querySelector('#data');
  document.body.querySelector('#collect').addEventListener('click', function() {
    var ov = new ObjectVisitor({
      maxDequeueSize: 1000,
      onDone: function() {
        dataElement.value = JSON.stringify(ov.toJSON());
      },
    });
    ov.visit(window, { key: 'window' });
  });
})();
