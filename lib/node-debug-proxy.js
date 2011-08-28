var Sys = require('sys'),
    Net = require('net'),
    _   = require('underscore')._;

var Proxy = function(localPort, localAddr, remotePort, remoteAddr) {
  this.localPort  = localPort;
  this.localAddr  = localAddr;
  this.remotePort = remotePort;
  this.remoteAddr = remoteAddr;

  this.delays = [];
  this.shouldDropConnectionOnNextWrite = false;

  this.connectionPairs = [];
};

exports.Proxy = Proxy;

/*
 * One proxy manages many connections.
 */
Proxy.prototype.start = function (startCallback) {
  var remotePort       = this.remotePort;
  var remoteAddr       = this.remoteAddr;
  var connectionPairs  = this.connectionPairs;
  var proxy            = this;

  this.server = Net.createServer(function(inboundConnection) {
    var bufferToUpstream   = [];
    var upstreamConnection = null;

    upstreamConnection = Net.createConnection(remotePort, remoteAddr);
    connectionPairs.push([inboundConnection, upstreamConnection]);

    upstreamConnection.on('connect', function () {
      bufferToUpstream.forEach(function (chunk) {
          upstreamConnection.write(chunk);
      });

      bufferToUpstream = [];
    });

    upstreamConnection.on('data', function(data) {
      if (inboundConnection.readyState == 'readOnly')
        return;

      inboundConnection.write(data);
    });

    upstreamConnection.on('error', function(err) {
        console.log({ upstreamConnectionError: err });

        inboundConnection.end();
    });

    upstreamConnection.on('close', function() {
      inboundConnection.destroy();
      inboundConnection.end();
    });

    inboundConnection.on('data', function(data) {
      if (proxy.shouldDropConnectionOnNextWrite) {
        proxy.shouldDropConnectionOnNextWrite = false;

        upstreamConnection.end();
        return;
      }

      if(upstreamConnection.readyState != 'open') {
          bufferToUpstream.push(data);
      } else {
          upstreamConnection.write(data);
      }
    });

    inboundConnection.on('end', function () {
      upstreamConnection.destroy();
      upstreamConnection.end();
    });
  });

  this.server.listen(this.localPort, this.localAddr, function () {
    if (startCallback)
      startCallback();
  });
};

Proxy.prototype.end = function () {
  if(typeof(this.server) !== 'undefined') {
    // Stop server listening for new connections
    this.server.close();
  }
};

Proxy.prototype.dropConnections = function () {
  _.each(this.connectionPairs, function (pair) {
    var incoming = pair[0],
        upstream = pair[1];

    if (incoming.readyState != 'closed' || upstream.readyState != 'closed') {
      incoming.end(); // upstream is closed automatically
    }
  });
};

Proxy.prototype.dropConnectionOnNextWrite = function () {
  this.shouldDropConnectionOnNextWrite = true;
};
