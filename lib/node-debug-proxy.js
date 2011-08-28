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

/*
 * One proxy manages many connections.
 */
Proxy.prototype.start = function (startCallback) {
  var remotePort = this.remotePort;
  var remoteAddr = this.remoteAddr;

  this.server = Net.createServer(function(inboundConnection) {
    var bufferToUpstream   = [];
    var upstreamConnection = null;

    upstreamConnection = Net.createConnection(remotePort, remoteAddr);
    upstreamConnection.on('connect', function () {
      bufferToUpstream.forEach(function (chunk) {
          upstreamConnection.write(chunk);
      });

      bufferToUpstream = [];
    });

    upstreamConnection.on('data', function(data) {
        inboundConnection.write(data);
    });

    upstreamConnection.on('error', function(err) {
        console.log({ upstreamConnectionError: err });

        inboundConnection.end();
    });

    upstreamConnection.on('close', function() {
      inboundConnection.end();
    });

    inboundConnection.on('data', function(data) {
      if(upstreamConnection.readyState != 'open') {
          bufferToUpstream.push(data);
      } else {
          upstreamConnection.write(data);
      }
    });

    inboundConnection.on('end', function () {
      upstreamConnection.end();
    });
  });

  this.server.listen(this.localPort, this.localAddr, function () {
    if (startCallback)
      startCallback();
  });
};

Proxy.prototype.end = function () {
  if(typeof(this.server) !== 'undefined')
    // Stop server listening for new connections
    this.server.close();
};

Proxy.prototype.drop = function () {
  // This needs to iterate over every connection.
  if(typeof(this.client) !== 'undefined')
    this.client.end();
};
