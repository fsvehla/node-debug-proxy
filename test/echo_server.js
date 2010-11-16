var Net   = require('net'),
    Proxy = require('lib/node-debug-proxy.js');

exports['it should relay'] = function (test) {
  var server = Net.createServer(function(socket) {
        socket.on('data', function (data) {
          socket.write(data);
        });
      });

  server.listen(12302);

  var proxy = new Proxy.Proxy(12301, '127.0.0.1', 12302, '127.0.0.1');
  proxy.start();

  var self = this;


  client = Net.createConnection(12302, '127.0.0.1');
  client.on('connect', function() {
    self.start = (new Date).getTime();
    client.write('hello');
  });

  client.on('data', function(data) {
    diff = (new Date).getTime() - self.start;
    test.ok(diff < 50, 'actally was: ' + diff);

    proxy.end();
    server.close();

    test.done();
  });
}

exports['it delays the request, when it is instructed to do so'] = function (test) {
  var server = Net.createServer(function(socket) {
      socket.on('data', function(data) {
        socket.write(data);
      });
    })

  server.listen(12302);

  var proxy = new Proxy.Proxy(12301, '127.0.0.1', 12302, '127.0.0.1');

  proxy.pushDelay('hullo', 10);
  proxy.start();

  var start = (new Date).getTime(), diff = 0;

  client = Net.createConnection(12301);
  client.on('connect', function() {
    client.write('hullo');
  });

  client.on('data', function(data) {
    diff = (new Date).getTime() - start;

    test.ok(diff >= 10, 'should take more than 1 second, but took ' + diff);

    client.end();
    proxy.end();

    server.close();

    test.done();
  });
}

exports['it works in a daisy chain'] = function (test) {
  var server = Net.createServer(function(socket) {
      socket.on('data', function(data) {
        socket.write(data);
      });
    })

  server.listen(12303);

  var fstProxy = new Proxy.Proxy(12301, '127.0.0.1', 12302, '127.0.0.1'),
      sndProxy = new Proxy.Proxy(12302, '127.0.0.1', 12303, '127.0.0.1');

  fstProxy.start();
  fstProxy.pushDelay('hello', 50);

  sndProxy.start();
  sndProxy.pushDelay('hello', 50);

  var start = (new Date).getTime(), diff = 0;

  client = Net.createConnection(12301);
  client.on('connect', function() {
    client.write('hello');
  });

  client.on('data', function(data) {
    diff = (new Date).getTime() - start;

    test.ok(diff >= 100, 'should take more than 0.1 seconds, but took ' + diff);

    server.close();

    client.end();

    fstProxy.end();
    sndProxy.end();

    test.done();
  });
}

exports['drop() drops the connection to the destination'] = function (test) {
  var server = Net.createServer(function(socket) {
      socket.on('end', function () {
        client.end();
        proxy.end();
        server.close();

        test.done();
      });
    });

  server.listen(12302);

  var proxy = new Proxy.Proxy(12301, '127.0.0.1', 12302, '127.0.0.1');
  proxy.start();

  client = Net.createConnection(12301);
  client.on('connect', function() {
    proxy.drop();
  });
};
