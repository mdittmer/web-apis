(function() {

  var bttn = document.createElement('button');
  bttn.id = 'copy';
  bttn.textContent = 'copy';
  bttn.setAttribute('data-clipboard-target', '#pre');

  var pre = document.createElement('pre');
  pre.id = 'pre';

  document.body.appendChild(pre);

  pre.textContent = 'Loading';

  var ov = new ObjectVisitor({
    maxDequeueSize: 1000,
    onTick: function() { pre.textContent += '...'; },
    onDone: function() {
      pre.textContent = JSON.stringify(ov.toJSON());
      document.body.insertBefore(bttn, pre);
      (new Clipboard(bttn));
    },
  });
  ov.visit(window, { key: 'window' });


  // var ov1 = new ObjectVisitor();
  // var ov2 = new ObjectVisitor();
  // var a = {
  //   'foo': function() {},
  //   'bar': 1,
  //   'quz': true,
  // };
  // var b = {
  //   'foo': function() {},
  //   'baz': null,
  //   'quz': a.foo,
  // };
  // ov1.visit(a, { onDone: function() {
  //   ov2.visit(b, { onDone: function() {
  //     var od = new ObjectDiff(ov1.toJSON(), ov2.toJSON());
  //     console.log(od);
  //   } });
  // } });

})();
