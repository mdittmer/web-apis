TaskQueue = (function() {
  // Very simple async task queue.
  var TaskQueue = function(opts) {
    opts = opts || {};
    this.q = [];
    this.maxDequeueSize = opts.maxDequeueSize || this.maxDequeueSize;
    this.onTick = opts.onTick || this.onTick;
    this.onDone = opts.onDone || this.onDone;
  };

  // Number of queued functions to run before allowing async tick.
  TaskQueue.prototype.maxDequeueSize = 10;
  // Singleton listeners for queue-fully-flushed and async-tick.
  TaskQueue.prototype.onDone = TaskQueue.prototype.onTick = function() {};

  TaskQueue.prototype.async = function(f) {
    window.setTimeout(f, 0);
  };

  // Enqueue a number of tasks.
  TaskQueue.prototype.enqueue = function(/* fs */) {
    for ( var i = 0; i < arguments.length; i++ ) {
      this.q.push(arguments[i]);
    }
  };

  // Flush at most this.maxDequeueSize tasks.
  TaskQueue.prototype.flush = function() {
    this.onTick();
    for ( var i = 0; i < this.maxDequeueSize && this.q.length > 0; i++ ) {
      var f = this.q.shift();
      f();
    }
    if ( this.q.length > 0 ) this.async(this.flush.bind(this));
    else                     this.onDone();
  };

  return facade(TaskQueue, {
    properties: [ 'maxDequeueSize', 'onTick', 'onDone' ],
    methods: { enqueue: 1, flush: 1 },
  });
})();
