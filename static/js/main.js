(function() {
  var browserElement = document.body.querySelector('#browser');
  var platformElement = document.body.querySelector('#platform');
  var environmentInfo = new NameRewriter().userAgentAsPlatformInfo(
    navigator.userAgent
  );
  browserElement.textContent = environmentInfo.browser.name + ' ' +
    environmentInfo.browser.version;
  platformElement.textContent = environmentInfo.platform.name + ' ' +
    environmentInfo.platform.version;

  var dataElement = document.body.querySelector('#data');
  document.body.querySelector('#collect').addEventListener('click', function() {
    var graph = new ObjectGraph({
      maxDequeueSize: 1000,
      onDone: function() {
        dataElement.value = JSON.stringify(graph.toJSON());
      },
    });
    graph.capture(window, { key: 'window' });
  });
})();
