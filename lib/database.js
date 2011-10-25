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


//
// Redis Data Set
// ==============
// 
//    session:<sessionid>:info -> browser
//    session:<sessionid>:actions:<datehour> -> [action]
// 
// 
//    timeline:<domainid>:<datehour> -> <List with active sessions this hour>
//

var enroll              = require("timers").enroll;
var unenroll            = require("timers").unenroll;
var active              = require("timers").active;


// Exported functions
exports.init            = init;
exports.destroy         = destroy;
exports.store           = store;
exports.getAddress      = getAddress;


// Internal constants
var TIMEOUT             = 120 * 1000; // 120 sec


// Internal variables
var debug               = false;
var verbose             = false;
var databases           = {};


function init(config, C) {

  debug = config.debug;
  verbose = debug || config.verbose;

  return C();
}


function destroy(C) {
  return C();
}

function store(address, graph) {
  var database;

  if (address.id in databases) {
    database = databases[address.id];
  } else {
    database = new Database(address);
  }

  database.store(graph);
}


function getAddress(expr) {
  var m;

  if ((m = /([A-Za-z0-9\-]*):(\d{1,5})/.exec(expr)) == null) {
    return null;
  }

  return {
    id: expr,
    host: m[1],
    port: parseInt(m[2])
  };
}


function getDatehour() {
  var d = new Date();
  function pad(no) {
    var s = no.toString()
    return s.length == 1 ? "0" + s : s;
  }

  return d.getUTCFullYear() +
         pad(d.getUTCMonth()) +
         pad(d.getUTCDate()) +
         pad(d.getUTCHours());
}


function Database(address) {
  this.id = address.id;
  this.host = address.host;
  this.port = address.port;
  this.channel = null;
  this.queue = null;
  this.destroyed = false;

  databases[address.id] = this;

  enroll(this, TIMEOUT);
  active(this);

  this.bindClient();
}


Database.prototype.ontimeout = function() {
  this.ontimeout = null;
  this.quit();
};


Database.prototype.bindClient = function() {
  var createClient = require("redis").createClient
  var self = this;
  var chan;

  (function dobind(chan) {
    var client = createClient(self.port, self.host);
    verbose && console.log("bind database %s:%s", self.host, self.port);
    client.on("connect", function() {
      verbose && console.log("connected to database %s:%s", self.host, self.port);
      if (self.destroyed) {
        this.quit();
        return;
      }
      self.queue && self.selfQueue();
    });
    client.on("error", function(err) {
      console.error(err.stack);
    });
    client.on("close", function() {
      self.client = null;
      if (self.destroyed == false) {
        setTimeout(dobind, 5000);
      };
    });
    self.client = client;
  })();
};


Database.prototype.store = function(graph) {
  var client;
  var datehour;
  var domain;
  var data;
  var info;
  var sid;
  var key;

  active(this);

  if (this.queue) {
    this.queue.push(graph);
    return false;
  }

  if (!(client = this.client)) {
    this.queue = [data];
    return false;
  }

  datehour = getDatehour();
  domain = graph.domainid;
  sid = graph.sid;

  switch (graph.op) {
    case "new": // New Session
      data = JSON.stringify({
        op: "hb",
        time: Date.now(),
        referrer: graph.referrer,
        lastvisit: graph.lastvisit,
        lng: graph.lng,
        lat: graph.lat,
        city: graph.city,
        country: graph.country
      });
      client.multi()
            .hmset("sesison:" + sid + ":info", {
              sw: graph.sw,
              sh: graph.sh,
              lastvisit: graph.lastvisit,
              lng: graph.lng,
              lat: graph.lat,
              city: graph.city,
              country: graph.country
            })
            .lpush("session:" + sid + ":actions:" + datehour, data)
            .sadd("timeline:" + domain + ":" + datehour, sid)
            .exec();
      break;
    case "hb": // Heart beat
      data = JSON.stringify({
        op: "hb",
        time: Date.now(),
        referrer: graph.referrer,
        lastvisit: graph.lastvisit,
        lng: graph.lng,
        lat: graph.lat,
        city: graph.city,
        country: graph.country
      });
      client.multi()
            .lpush("session:" + sid + ":actions:" + datehour, data)
            .sadd("timeline:" + domain + ":" + datehour, sid)
            .exec();
      break;
    case "pv": // Page View
      data = JSON.stringify({
        op: "pv",
        time: Date.now(),
        url: graph.url,
        t: graph.t,
        r: graph.r
      });
      client.multi()
            .lpush("session:" + sid + ":actions:" + datehour, data)
            .sadd("timeline:" + domain + ":" + datehour, sid)
            .exec();
      break;
    case "ue": // User Event
      data = JSON.stringify({
        op: "ue",
        time: Date.now(),
        url: graph.url,
        data: graph.data
      });
      client.multi()
            .lpush("session:" + sid + ":actions:" + datehour, data)
            .sadd("timeline:" + domain + ":" + datehour, sid)
            .exec();
      break;
    case "de": // Destroy
      data = JSON.stringify({
        op: "de",
        time: Date.now()
      });
      client.multi()
            .lpush("session:" + sid + ":actions:" + datehour, data)
            .sadd("timeline:" + domain + ":" + datehour, sid)
            .exec();
      break;
  }
};


Database.prototype.flushQueue = function() {
  var queue = this.queue;

  this.queue = null;

  if (queue) {
    for (var i = 0, l = queue.length; i < l; i++) {
      this.store(queue[i]);
    }
  }
};


Database.prototype.destroy = function() {

  if (this.destroyed) {
    return;
  }

  this.destroyed = true;

  if (this.client) {
    this.client.destroy();
    this.client = null;
  }

  unenroll(this);

  delete databases[this.id];
};