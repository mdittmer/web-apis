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


  // var ov1 = new ObjectVisitor({ maxDequeueSize: 1000 });
  // var ov2 = new ObjectVisitor({ maxDequeueSize: 1000 });
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
  // ov1.visit(window, {
  //   key: 'window',
  //   onDone: function() {
  //     console.log('Done ov1');
  //     ov2.visit(window, {
  //       key: 'window',
  //       onDone: function() {
  //         console.log('Done ov2');
  //         var od = new ObjectDiff(ov1.toJSON(), ov2.toJSON(), {
  //           maxDequeueSize: 1000,
  //           onDone: function(od) {
  //             console.log(od);
  //             var badIds = Object.getOwnPropertyNames(od.abConflict).map(function(idStr) {
  //               return parseInt(idStr);
  //             });
  //             ov1; ov2;
  //             for ( var i = 0; i < badIds.length; i++ ) {
  //               console.log(badIds[i], od.map[badIds[i]],
  //                           od.abConflict[badIds[i]],
  //                           ov1.getKeys(badIds[i]),
  //                           ov1.getKeys(od.map[badIds[i]]));
  //             }
  //           }
  //         });
  //       },
  //     });
  //   },
  // });

})();
