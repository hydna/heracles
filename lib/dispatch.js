//
//        Copyright 2011-2012 Hydna AB. All rights reserved.
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

var inherits              = require("util").inherits;

var parse                 = require("url").parse;
var Server                = require("http").Server;

var log                   = require("./log");
var notFound              = require("./helpers").notFound;


// Exported functions
exports.createDispatcher  = createDispatcher;


function createDispatcher (name) {
  return new Dispatcher(name);
}


function Dispatcher (name) {
  Server.call(this);
  this.name = name
  this.handlers = {};
  this.on("request", this.onrequest);
}


inherits(Dispatcher, Server);


Dispatcher.prototype.onrequest = function (req, res) {
  var remotehost = req.connection.remoteAddress;
  var handlers = this.handlers;
  var url = parse(req.url, true);
  var handler;

  log.debug("Incomming request (%s) %s", remotehost, url.pathname);

  handler = handlers[url.pathname] || notFound;

  req.query = url.query;

  return handler(req, res);
};


Dispatcher.prototype.addHandler = function (path, C) {
  if (path in this.handlers) {
    throw new Error("Handler for path '" + path + "' is already defined");
  }
  this.handlers[path] = C;
};