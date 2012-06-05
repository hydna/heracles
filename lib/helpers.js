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


// Exported functions
exports.ok              = ok;
exports.notFound        = notFound;
exports.badRequest      = badRequest;
exports.methodNotAllowed=methodNotAllowed;
exports.notModified     = notModified;
exports.file            = file;


var BODY                = require("http").STATUS_CODES;
var PACKAGE_NAME        = require("../package").name;
var PACKAGE_VERSION     = require("../package").version;
var SERVER_NAME         = [PACKAGE_NAME, PACKAGE_VERSION].join("/");


function ok (req, res) { return out(res, 200, ""); }
function notFound (req, res) { return out(res, 404); }
function badRequest (req, res) { return out(res, 400); }
function methodNotAllowed (req, res) { return out(res, 405); }
function notModified (req, res) { return out(res, 304); }

function file (req, res, buffer, contentType, enc) {
  res.setHeader("Content-Type", contentType || "text/plain");
  res.setHeader("Content-Length", buffer.length);
  res.setHeader("Server", SERVER_NAME);
  res.writeHead(200);
  res.end(buffer, enc);
}

function out (res, code, body, enc) {
  var headers = {};

  res.setHeader("Server", SERVER_NAME);

  body = body || "<html><body>" + code +  " " + BODY[code] + "</body></html>";

  res.writeHead(code);
  res.end(body, enc);
}