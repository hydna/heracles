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


var MODULES = [
  __dirname + "/database",
  __dirname + "/domain",
  __dirname + "/hydna",
  __dirname + "/dispatch",
  __dirname + "/session",
  __dirname + "/geoip"
];


// Exported functions
exports.init                = init;
exports.shutdown            = shutdown;
exports.save                = save;
exports.restore             = restore;


// Internal constants
var ME                      = "modules"


// Internal variables
var debug                   = false;
var verbose                 = false;



function init(config, C) {
  var modules = MODULES.slice(0);

  debug = config.debug;
  verbose = debug || config.verbose;

  verbose && console.log("%s: Starting loading process...", ME);

  (function next(err) {
    var path = modules.shift();
    var module;
    if (err) return C(err);
    if (path) {
      verbose && console.log("%s: Loading module `%s.js`...", ME, path);
      try {
        module = require(path);
        module.init(config, next);
      } catch (err) {
        console.log(err.stack);
        return C(err);
      }
    } else {
      verbose && console.log("%s: Loading process complete", ME);
      return C();
    }
  })();
}


function shutdown(C) {
  modules = MODULES.slice(0);

  verbose && console.log("%s: Starting shutdown process...", ME);

  (function next(err) {
    var path = modules.shift();
    var module;
    if (err) {
      verbose && console.log("%s: An error occured `%s`", ME, err.message);
    }
    if (path) {
      verbose && console.log("%s: Shutting down module `%s.js`...", ME, path);
      try {
        module = require(path);
        module.shutdown(next);
      } catch (err) {
        return next(err);
      }
    } else {
      verbose && console.log("%s: Shutdown process complete", ME);
      return C();
    }
  })();
}


function save(state) {
  throw new Error("not implemented");
}


function restore(state) {
  throw new Error("not implemented");
}