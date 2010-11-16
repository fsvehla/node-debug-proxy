var Sys = require('sys'),
    Net = require('net');

var Proxy = function(localPort, localAddr, remotePort, remoteAddr) {
  this.localPort  = localPort;
  this.localAddr  = localAddr;
  this.remotePort = remotePort;
  this.remoteAddr = remoteAddr;

  this.delays = [];
  this.dropNext = false;
};

exports.Proxy = Proxy;

Proxy.prototype.start = function () {
  var self = this;

  this.server = Net.createServer(function(socket) {
    socket.on('connect', function () {
      self.client = Net.createConnection(self.remotePort, self.remoteAddr);

      self.client.on('data', function(data) {
        if(socket.readyState == 'open') {
          socket.write(data);
        } else {
          socket.end();
        }
      });

      self.client.on('error', function() { socket.end(); });
      self.client.on('close', function() { socket.end(); });
    });

    socket.on('data', function(data) {
      var chunk = data.toString('ascii'),
          delay = 0;

      self.delays.forEach(function (delayedData) {
        if(chunk.indexOf(delayedData.chunk) != -1) {
          delay = delayedData.delay;
        };
      });

      setTimeout(function () {
        self.client.write(data);
      }, delay);
    });

    socket.on('end', function () {
      self.client.end();
    });
  });

  this.server.listen(this.localPort, this.localAddr);
};

Proxy.prototype.pushDelay = function (chunk, delay) {
  if(typeof(delay) === 'undefined') {
    delay = 100;
  };

  this.delays.push({'chunk': chunk, 'delay': delay});
};

Proxy.prototype.end = function () {
  if(typeof(this.server) !== 'undefined')
    this.server.close();
};

Proxy.prototype.drop = function () {
  if(typeof(this.client) !== 'undefined')
    this.client.end();
};
