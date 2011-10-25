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

var parse                 = require("url").parse;

var find                  = require("./domain").find;
var getSession            = require("./session").getSession;


// Exported functions
exports.init            = init;
exports.destroy         = destroy;
exports.dispatch        = dispatch;


// Internal constants
var VISIT_TIMEOUT       = 20 * 60000; // 20 min


// Internal variables
var debug               = false;
var verbose             = false;
var handlers            = {};
var servername          = null;
var trackerjs           = null;


handlers = {
  "/s": session,
  "/s/": session,
  "/t.js": script
}


function init(config, C) {
  var readFile = require("fs").readFile;
  var resolve = require("path").resolve;
  var jsp = require("uglify-js").parser;
  var pro = require("uglify-js").uglify;
  var path;

  debug = config.debug;
  verbose = debug || config.verbose;

  path = config.tracker || resolve(__dirname, "../public/tracker.js");
  servername = config.name ||
               "heracles/" + require("../package.json").version

  verbose && console.log("Loading tracker script from '%s'", path);

  readFile(path, "utf8", function(err, content) {
    var ast;

    if (err) return C(err);

    if (debug) {
      trackerjs = new Buffer(content);
    } else {
      ast = jsp.parse(content);
      ast = pro.ast_mangle(ast);
      ast = pro.ast_squeeze(ast);
      trackerjs = new Buffer(pro.gen_code(ast));
    }

    return C();
  });
}


function destroy(C) {
  return C();
}


function dispatch(req, res) {
  var remotehost = req.connection.remoteAddress;
  var url = parse(req.url, true);

  debug && console.log("Incomming request (%s) %s", remotehost, url.pathname);

  handler = handlers[url.pathname] || notfound;

  req.query = url.query;

  return handler(req, res);
}


function getHeaders() {
  return {
    "Date":   (new Date()).toUTCString(),
    "Server": servername
  };
}


function notfound(req, res) {
  res.writeHead(404, getHeaders());
  res.end();
}


function script(req, res) {
  var headers = getHeaders();
  headers["Content-Type"] = "text/javascript";
  headers["Content-Length"] = trackerjs.length;
  res.writeHead(200, headers);
  res.end(trackerjs, "utf8");
}


function session(req, res) {
  var address = req.connection.remoteAddress;
  var referer = req.headers["referer"];
  var query = req.query;
  var session;
  var result;
  var domain;

  domain = find(referer, query._id);

  if (!domain) {
    res.writeHead(400, getHeaders());
    res.end();
    return;
  }

  session = getSession(domain, req, query);

  if (!session) {
    res.writeHead(400, getHeaders());
    res.end();
    return;
  }

  function end() {
    if (query._a) {
      session.dispatch(referer, query._a || "");
    } else if (query._d == 1) {
      session.navigateFrom();
    } else {
      session.navigateTo(referer, query.r, query.t);
    }

    if (session.serversession) {
      session.updateTimestamp();
      headers["Set-Cookie"] = session.getCookieString();
    }

    res.writeHead(200, getHeaders());
    res.end();
  }

  if (session.lastvisit == 0) {
    session.init(address, query.r || "", end);
  } else if (session.lastvisit + VISIT_TIMEOUT < Date.now()) {
    session.heartbeat(address, query.r || "", end);
  } else {
    end();
  }
}