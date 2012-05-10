//
//        Copyright 2011 Hydna AB. All rights reserved.
//
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions
//  are met:
//
//    1. Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//
//    2. Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//
//  THIS SOFTWARE IS PROVIDED BY HYDNA AB ``AS IS'' AND ANY EXPRESS OR IMPLIED
//  WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
//  MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO
//  EVENT SHALL HYDNA AB OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
//  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF
//  USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
//  ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
//  TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE
//  USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//  The views and conclusions contained in the software and documentation are
//  those of the authors and should not be interpreted as representing
//  official policies, either expressed or implied, of Hydna AB.
//

var enroll              = require("timers").enroll;
var unenroll            = require("timers").unenroll;
var active              = require("timers").active;

var log                 = require("./log");


// Exported functions
exports.broadcast       = broadcast;


// Internal constants
var TIMEOUT             = 120 * 1000; // 120 sec


// Internal variables
var connections         = {};


function broadcast(url, graph) {
  var conn;

  if (url in connections) {
    conn = connections[url];
  } else {
    conn = new Connection(url);
  }

  conn.write(JSON.stringify(graph));
}



function Connection(url) {
  this.url = url;
  this.channel = null;
  this.queue = null;
  this.destroyed = false;

  connections[url] = this;

  enroll(this, TIMEOUT);
  active(this);

  // this.bindChannel();
}


Connection.prototype.ontimeout = function() {
  this.ontimeout = null;
  this.destroy();
};


Connection.prototype.bindChannel = function() {
  var createChannel = require("hydna").createChannel;
  var self = this;
  var chan;

  (function dobind(chan) {
    var chan = createChannel(self.url, "w");
    log.debug("bind hydna channel %s", self.url);
    chan.on("connect", function() {
      self.queue && self.flushQueue();
    });
    chan.on("error", function(err) {
      console.error(err.stack);
    });
    chan.on("close", function() {
      self.channel = null;
      if (self.destroyed == false) {
        setTimeout(dobind, 5000);
      };
    });
    self.channel = chan;
  })();
};


Connection.prototype.write = function(data) {

  active(this);

  if (this.queue) {
    this.queue.push(data);
    return;
  }

  if (!this.channel) {
    this.queue = [data];
    return;
  }

  this.channel.write(data);
};


Connection.prototype.flushQueue = function() {
  var queue = this.queue;

  this.queue = null;

  if (queue) {
    for (var i = 0, l = queue.length; i < l; i++) {
      this.write(queue[i]);
    }
  }
};


Connection.prototype.destroy = function() {

  if (this.destroyed) {
    return;
  }

  this.destroyed = true;

  if (this.channel) {
    this.channel.destroy();
    this.channel = null;
  }

  unenroll(this);

  delete connections[this.url];
};